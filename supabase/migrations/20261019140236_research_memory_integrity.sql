CREATE OR REPLACE FUNCTION public.upsert_vanguard_entity_link(
  p_user_id uuid, p_source text, p_source_type text DEFAULT NULL,
  p_relation text DEFAULT NULL, p_target text DEFAULT NULL,
  p_target_type text DEFAULT NULL, p_confidence_score double precision DEFAULT NULL,
  p_memory_type text DEFAULT NULL, p_layer text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL, p_source_episode_id uuid DEFAULT NULL,
  p_observed_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_source text := public.canonicalize_vanguard_entity(p_user_id, p_source);
  v_target text := public.canonicalize_vanguard_entity(p_user_id, p_target);
  v_relation text := btrim(coalesce(p_relation, ''));
  v_memory_type text := coalesce(nullif(p_memory_type, ''), 'fact');
  v_obs_at timestamptz := coalesce(p_observed_at, now());
  v_confidence double precision := greatest(0, least(1, coalesce(p_confidence_score, 0.6)));
  v_link public.vanguard_entity_links%ROWTYPE;
  v_old public.vanguard_entity_links%ROWTYPE;
  v_link_id uuid;
  v_supersedes uuid := nullif(p_metadata->>'supersedes_link_id', '')::uuid;
  v_singleton boolean;
  v_historical boolean;
  v_valid_until timestamptz;
  v_superseded_by uuid;
  v_temporal text;
  v_subject_id uuid;
  v_object_id uuid;
  v_old_object_id uuid;
  v_scope_ids uuid[];
  v_same_target_ids uuid[];
BEGIN
  IF coalesce(v_source, '') = '' OR coalesce(v_target, '') = ''
     OR v_relation = '' OR v_source = v_target THEN RETURN; END IF;
  IF v_memory_type NOT IN ('fact', 'hypothesis', 'preference', 'correlation', 'telemetry') THEN
    v_memory_type := 'fact';
  END IF;
  -- Resolve under a per-user lock because the existing resolver may insert entities.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  v_subject_id := public.resolve_entity(p_user_id, v_source, coalesce(nullif(p_source_type, ''), 'unknown'));
  v_object_id := public.resolve_entity(p_user_id, v_target, coalesce(nullif(p_target_type, ''), 'unknown'));
  IF v_subject_id = v_object_id THEN RETURN; END IF;
  SELECT canonical_name INTO v_source FROM public.entities WHERE id = v_subject_id AND user_id = p_user_id;
  SELECT canonical_name INTO v_target FROM public.entities WHERE id = v_object_id AND user_id = p_user_id;
  -- Alias/case/merged labels use the same resolved subject/relation key.
  PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array(p_user_id, v_subject_id, v_relation)::text, 0));
  SELECT coalesce(array_agg(l.id), ARRAY[]::uuid[]),
    coalesce(array_agg(l.id) FILTER (WHERE public.resolve_entity(p_user_id, l.target_entity, l.target_type) = v_object_id), ARRAY[]::uuid[])
  INTO v_scope_ids, v_same_target_ids
  FROM public.vanguard_entity_links l
  WHERE l.user_id = p_user_id AND l.relation = v_relation
    AND public.resolve_entity(p_user_id, l.source_entity, l.source_type) = v_subject_id;
  SELECT * INTO v_link FROM public.vanguard_entity_links
  WHERE id = ANY(v_same_target_ids)
  ORDER BY (status = 'active') DESC, observed_at DESC NULLS LAST, id LIMIT 1 FOR UPDATE;
  v_link_id := coalesce(v_link.id, gen_random_uuid());
  IF v_supersedes IS NULL AND nullif(btrim(p_metadata->>'supersedes_target'), '') IS NOT NULL THEN
    v_old_object_id := public.resolve_entity(p_user_id,
      public.canonicalize_vanguard_entity(p_user_id, p_metadata->>'supersedes_target'), 'unknown');
    SELECT id INTO v_supersedes FROM public.vanguard_entity_links
    WHERE id = ANY(v_scope_ids) AND NOT (id = ANY(v_same_target_ids))
      AND public.resolve_entity(p_user_id, target_entity, target_type) = v_old_object_id
    ORDER BY (status = 'active') DESC, observed_at DESC NULLS LAST, id LIMIT 1;
    IF v_supersedes IS NULL THEN RAISE EXCEPTION 'Invalid superseded target scope' USING ERRCODE = '22023'; END IF;
  END IF;
  IF v_supersedes IS NOT NULL THEN
    SELECT * INTO v_old FROM public.vanguard_entity_links
    WHERE id = v_supersedes AND id = ANY(v_scope_ids) AND NOT (id = ANY(v_same_target_ids)) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid superseded link scope' USING ERRCODE = '22023'; END IF;
  END IF;
  -- Claims retain the observation set across reactivation. No history is invented.
  IF p_source_episode_id IS NOT NULL AND (
    v_link.source_episode_id = p_source_episode_id OR EXISTS (
      SELECT 1 FROM public.claims c
      JOIN public.entities s ON s.id = c.subject_id JOIN public.entities o ON o.id = c.object_id
      JOIN public.relations r ON r.id = c.relation_id
      WHERE c.user_id = p_user_id AND r.name = v_relation
        AND public.resolve_entity(p_user_id, s.canonical_name, s.kind) = v_subject_id
        AND public.resolve_entity(p_user_id, o.canonical_name, o.kind) = v_object_id
        AND p_source_episode_id = ANY(c.source_observation_ids)
    )
  ) THEN RETURN; END IF;
  IF v_supersedes IS NOT NULL AND v_old.status IS DISTINCT FROM 'active'
    AND v_old.superseded_by IS DISTINCT FROM v_link_id THEN
    RAISE EXCEPTION 'Superseded link changed; re-evaluate current facts' USING ERRCODE = '40001';
  END IF;
  SELECT coalesce((SELECT is_singleton FROM public.relations WHERE name = v_relation), false) INTO v_singleton;
  -- A backdated observation cannot replace a newer active fact.
  SELECT id, observed_at INTO v_superseded_by, v_valid_until FROM public.vanguard_entity_links
  WHERE id = ANY(v_scope_ids) AND NOT (id = ANY(v_same_target_ids)) AND status = 'active' AND observed_at > v_obs_at
    AND (v_singleton OR id = v_supersedes) ORDER BY observed_at ASC LIMIT 1;
  v_historical := FOUND;
  v_temporal := CASE WHEN v_historical THEN 'historical' WHEN v_memory_type = 'hypothesis' THEN 'hypothesis'
    WHEN v_relation = 'deklaruje' THEN 'declared' ELSE 'current' END;
  -- Insert first; claim projection and supersession roll back together on any error.
  INSERT INTO public.vanguard_entity_links AS existing (
    id, user_id, source_entity, source_type, relation, target_entity, target_type,
    evidence_count, weight, first_seen, last_seen, observed_at, valid_from,
    valid_until, superseded_by, status, temporal_status, confidence_score,
    memory_type, layer, metadata, source_episode_id
  ) VALUES (
    v_link_id, p_user_id, coalesce(v_link.source_entity, v_source),
    CASE WHEN v_source = 'Jakub' THEN 'person' ELSE coalesce(nullif(btrim(p_source_type), ''), 'unknown') END,
    v_relation, coalesce(v_link.target_entity, v_target),
    CASE WHEN v_target = 'Jakub' THEN 'person' ELSE coalesce(nullif(btrim(p_target_type), ''), 'unknown') END,
    1, 1.0, v_obs_at::date, v_obs_at::date, v_obs_at, v_obs_at, v_valid_until, v_superseded_by,
    CASE WHEN v_historical THEN 'historical' ELSE 'active' END, v_temporal, v_confidence, v_memory_type,
    coalesce(nullif(p_layer, ''), 'intelligence'),
    (coalesce(p_metadata, '{}'::jsonb) - 'supersedes_link_id' - 'supersedes_target') || jsonb_build_object('last_upserted_at', now()),
    p_source_episode_id
  ) ON CONFLICT (user_id, source_entity, relation, target_entity) DO UPDATE SET
    evidence_count = coalesce(existing.evidence_count, 0) + 1,
    weight = least(5.0, coalesce(existing.weight, 1.0) + 0.2),
    first_seen = least(existing.first_seen, EXCLUDED.first_seen), last_seen = greatest(existing.last_seen, EXCLUDED.last_seen),
    observed_at = greatest(existing.observed_at, EXCLUDED.observed_at),
    valid_from = CASE WHEN existing.status <> 'active' AND EXCLUDED.status = 'active'
      AND v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN v_obs_at ELSE existing.valid_from END,
    status = CASE WHEN v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN EXCLUDED.status ELSE existing.status END,
    temporal_status = CASE WHEN v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN EXCLUDED.temporal_status ELSE existing.temporal_status END,
    valid_until = CASE WHEN v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN EXCLUDED.valid_until ELSE existing.valid_until END,
    superseded_by = CASE WHEN v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN EXCLUDED.superseded_by ELSE existing.superseded_by END,
    confidence_score = greatest(existing.confidence_score, EXCLUDED.confidence_score),
    memory_type = CASE WHEN existing.memory_type = 'fact' THEN 'fact' ELSE EXCLUDED.memory_type END,
    layer = CASE WHEN v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN EXCLUDED.layer ELSE existing.layer END,
    source_episode_id = coalesce(EXCLUDED.source_episode_id, existing.source_episode_id),
    metadata = CASE WHEN v_obs_at >= coalesce(existing.observed_at, '-infinity'::timestamptz) THEN coalesce(existing.metadata, '{}'::jsonb) || EXCLUDED.metadata ELSE existing.metadata END;
  IF NOT v_historical AND (v_link.id IS NULL OR v_obs_at >= coalesce(v_link.observed_at, '-infinity'::timestamptz)) THEN
    UPDATE public.vanguard_entity_links SET
      status = 'deprecated', temporal_status = 'historical', valid_until = v_obs_at, superseded_by = v_link_id,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('deprecated_reason', 'superseded by newer fact', 'deprecated_at', now())
    WHERE id = ANY(v_scope_ids) AND NOT (id = ANY(v_same_target_ids))
      AND status = 'active' AND observed_at <= v_obs_at AND (v_singleton OR id = v_supersedes);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_vanguard_entity_link(uuid, text, text, text, text, text, double precision, text, text, jsonb, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_vanguard_entity_link(uuid, text, text, text, text, text, double precision, text, text, jsonb, uuid, timestamptz) TO service_role;


-- Extend the existing soft-delete projection; keep it the only graph projection.
CREATE OR REPLACE FUNCTION public.sync_vanguard_entity_links_to_claims()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_uuid uuid;
  v_relation_uuid uuid;
  v_object_uuid uuid;
  v_is_singleton boolean;
  v_temp_status text;
  v_claim_id uuid;
  v_learned_at timestamp with time zone;
  v_epistemic_status text;
  v_derivation text;
  v_observation_ids uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.claims
    SET status = 'deprecated',
        valid_to = coalesce(OLD.valid_until, now()),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'deprecated_reason', 'deleted from source links',
          'deprecated_at', now()
        )
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  v_epistemic_status := CASE
    WHEN NEW.memory_type = 'hypothesis' THEN 'hypothesis'
    WHEN NEW.memory_type = 'preference' THEN 'preference'
    WHEN NEW.memory_type = 'correlation' THEN 'hypothesis'
    ELSE 'fact'
  END;
  v_derivation := CASE
    WHEN NEW.memory_type = 'correlation' THEN 'deterministic'
    ELSE 'llm'
  END;

  -- Resolve subject entity via entity resolution helper
  v_subject_uuid := public.resolve_entity(NEW.user_id, NEW.source_entity, NEW.source_type);

  -- Sprawdź czy relacja jest singletonem
  SELECT is_singleton INTO v_is_singleton FROM public.relations WHERE name = NEW.relation;
  IF v_is_singleton IS NULL THEN
    v_is_singleton := NEW.relation IN (
      'pracuje_w', 'jest_zatrudniony_w', 'mieszka_w', 'studiuje_na', 'uczęszcza_do',
      'jest_w_związku_z', 'ma_wiek', 'pełni_rolę', 'jest_liderem_w', 'ma_aktywny_cel',
      'jest', 'ma_role', 'uczestniczy_w', 'studiuje', 'pracuje_nad'
    );
  END IF;

  -- Resolve/Insert relation
  INSERT INTO public.relations (name, is_singleton)
  VALUES (NEW.relation, v_is_singleton)
  ON CONFLICT (name) DO UPDATE SET
    is_singleton = EXCLUDED.is_singleton
  RETURNING id INTO v_relation_uuid;

  -- Resolve object entity via entity resolution helper
  v_object_uuid := public.resolve_entity(NEW.user_id, NEW.target_entity, NEW.target_type);

  -- Check if we have an active claim for this triple
  SELECT id, learned_at INTO v_claim_id, v_learned_at
  FROM public.claims
  WHERE user_id = NEW.user_id
    AND subject_id = v_subject_uuid
    AND relation_id = v_relation_uuid
    AND object_id = v_object_uuid
    AND status = 'active'
  ORDER BY learned_at DESC
  LIMIT 1;

  -- Union evidence across historical episodes before any claim ID is rotated.
  SELECT coalesce(array_agg(DISTINCT observation_id ORDER BY observation_id), ARRAY[]::uuid[])
  INTO v_observation_ids
  FROM (
    SELECT unnest(c.source_observation_ids) AS observation_id FROM public.claims c
    JOIN public.entities source_entity ON source_entity.id = c.subject_id
    JOIN public.entities target_entity ON target_entity.id = c.object_id
    WHERE c.user_id = NEW.user_id AND c.relation_id = v_relation_uuid
      AND public.resolve_entity(NEW.user_id, source_entity.canonical_name, source_entity.kind) = v_subject_uuid
      AND public.resolve_entity(NEW.user_id, target_entity.canonical_name, target_entity.kind) = v_object_uuid
    UNION ALL SELECT NEW.source_episode_id WHERE NEW.source_episode_id IS NOT NULL
  ) observations;

  -- Bi-temporal state transitions
  IF TG_OP = 'UPDATE' AND OLD.status IN ('deprecated', 'historical') AND NEW.status = 'active' THEN
    -- Reactivation! To preserve history, rename the old deprecated claim's ID
    UPDATE public.claims SET id = gen_random_uuid() WHERE id = NEW.id;
    -- Now NEW.id is free, so we can insert the new active claim!
    INSERT INTO public.claims (
      id, user_id, subject_id, relation_id, object_id,
      epistemic_status, derivation, source_observation_ids,
      weight, evidence_count, learned_at, valid_from, valid_to, status, metadata, fact_text, embedding, superseded_by
    )
    VALUES (
      NEW.id, NEW.user_id, v_subject_uuid, v_relation_uuid, v_object_uuid,
      v_epistemic_status,
      v_derivation,
      v_observation_ids,
      NEW.weight, NEW.evidence_count, clock_timestamp(), NEW.valid_from, NEW.valid_until,
      NEW.status, coalesce(NEW.metadata, '{}'::jsonb), NEW.fact_text, NEW.embedding,
      CASE WHEN EXISTS (SELECT 1 FROM public.claims successor WHERE successor.id = NEW.superseded_by)
        THEN NEW.superseded_by ELSE NULL END
    );
  ELSIF EXISTS (SELECT 1 FROM public.claims WHERE id = NEW.id) THEN
    -- The claim already exists (active or deprecated), so just update it!
    UPDATE public.claims
    SET
      weight = NEW.weight,
      superseded_by = CASE WHEN NEW.superseded_by IS NULL THEN NULL
        WHEN EXISTS (SELECT 1 FROM public.claims successor WHERE successor.id = NEW.superseded_by)
          THEN NEW.superseded_by ELSE superseded_by END,
      source_observation_ids = v_observation_ids,
      evidence_count = NEW.evidence_count,
      status = NEW.status,
      valid_to = NEW.valid_until,
      metadata = coalesce(NEW.metadata, '{}'::jsonb),
      fact_text = NEW.fact_text,
      embedding = NEW.embedding,
      epistemic_status = v_epistemic_status,
      derivation = v_derivation
    WHERE id = NEW.id;
  ELSIF v_claim_id IS NOT NULL THEN
    -- Update the existing active claim (preserves history by keeping learned_at and valid_from)
    UPDATE public.claims
    SET
      weight = NEW.weight,
      superseded_by = CASE WHEN NEW.superseded_by IS NULL THEN NULL
        WHEN EXISTS (SELECT 1 FROM public.claims successor WHERE successor.id = NEW.superseded_by)
          THEN NEW.superseded_by ELSE superseded_by END,
      source_observation_ids = v_observation_ids,
      evidence_count = NEW.evidence_count,
      status = NEW.status,
      valid_to = NEW.valid_until,
      metadata = coalesce(NEW.metadata, '{}'::jsonb),
      fact_text = NEW.fact_text,
      embedding = NEW.embedding,
      epistemic_status = v_epistemic_status,
      derivation = v_derivation
    WHERE id = v_claim_id;
  ELSE
    -- No active claim exists, let's insert one or update the latest deprecated one matching ID
    IF NEW.status = 'deprecated' THEN
      UPDATE public.claims
      SET
        weight = NEW.weight,
      superseded_by = CASE WHEN NEW.superseded_by IS NULL THEN NULL
        WHEN EXISTS (SELECT 1 FROM public.claims successor WHERE successor.id = NEW.superseded_by)
          THEN NEW.superseded_by ELSE superseded_by END,
      source_observation_ids = v_observation_ids,
        evidence_count = NEW.evidence_count,
        status = NEW.status,
        valid_to = NEW.valid_until,
        metadata = coalesce(NEW.metadata, '{}'::jsonb),
        fact_text = NEW.fact_text,
        embedding = NEW.embedding,
        epistemic_status = v_epistemic_status,
        derivation = v_derivation
      WHERE id = NEW.id;
    ELSE
      INSERT INTO public.claims (
        id, user_id, subject_id, relation_id, object_id,
        epistemic_status, derivation, source_observation_ids,
        weight, evidence_count, learned_at, valid_from, valid_to, status, metadata, fact_text, embedding, superseded_by
      )
      VALUES (
        NEW.id, NEW.user_id, v_subject_uuid, v_relation_uuid, v_object_uuid,
        v_epistemic_status,
        v_derivation,
        v_observation_ids,
        NEW.weight, NEW.evidence_count, NEW.created_at, NEW.observed_at, NEW.valid_until,
        NEW.status, coalesce(NEW.metadata, '{}'::jsonb), NEW.fact_text, NEW.embedding,
      CASE WHEN EXISTS (SELECT 1 FROM public.claims successor WHERE successor.id = NEW.superseded_by)
        THEN NEW.superseded_by ELSE NULL END
      );
    END IF;
  END IF;

  -- Singleton deprecation on claims
  IF v_is_singleton AND NEW.status = 'active' THEN
    UPDATE public.claims
    SET
      status = 'deprecated',
      valid_to = NEW.observed_at,
      superseded_by = NEW.id,
      metadata = metadata || jsonb_build_object(
        'deprecated_reason', 'superseded by newer claim via sync',
        'deprecated_at', now()
      )
    WHERE user_id = NEW.user_id
      AND subject_id = v_subject_uuid
      AND relation_id = v_relation_uuid
      AND object_id != v_object_uuid
      AND status = 'active'
      AND valid_from <= NEW.observed_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.sync_vanguard_entity_links_to_claims() SET search_path = '';

-- Forward-only revision ledger for existing user-authored core memory preferences.
CREATE TABLE public.vanguard_core_memory_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_id uuid NOT NULL,
  key text NOT NULL CHECK (left(key, 12) = 'core_memory:'),
  operation text NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  old_value text,
  new_value text,
  old_is_active boolean,
  new_is_active boolean,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by uuid
);
CREATE INDEX vanguard_core_memory_revisions_owner_key_time
  ON public.vanguard_core_memory_revisions(user_id, key, changed_at DESC, id DESC);
ALTER TABLE public.vanguard_core_memory_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vanguard_core_memory_revisions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.vanguard_core_memory_revisions TO authenticated, service_role;
CREATE POLICY core_memory_revisions_owner_read ON public.vanguard_core_memory_revisions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY core_memory_revisions_service_read ON public.vanguard_core_memory_revisions
  FOR SELECT TO service_role USING (true);

-- Definer is required only for trigger-owned appends; the function cannot be
-- invoked directly and accepts no externally supplied history values.
CREATE OR REPLACE FUNCTION public.record_core_memory_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_old_core boolean := TG_OP <> 'INSERT' AND left(OLD.key, 12) = 'core_memory:';
  v_new_core boolean := TG_OP <> 'DELETE' AND left(NEW.key, 12) = 'core_memory:';
BEGIN
  IF TG_OP = 'UPDATE' AND (v_old_core OR v_new_core)
    AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.key IS DISTINCT FROM OLD.key OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Core memory identity is immutable' USING ERRCODE = '22023';
  END IF;
  IF NOT coalesce(v_old_core, false) AND NOT coalesce(v_new_core, false) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.value IS NOT DISTINCT FROM OLD.value
    AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN RETURN NEW; END IF;
  IF TG_OP <> 'DELETE' THEN NEW.updated_at := clock_timestamp(); END IF;
  INSERT INTO public.vanguard_core_memory_revisions(
    user_id, preference_id, key, operation, old_value, new_value,
    old_is_active, new_is_active, changed_by
  ) VALUES (
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.key ELSE NEW.key END,
    lower(TG_OP),
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.value END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.value END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.is_active END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.is_active END, auth.uid()
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_core_memory_revision() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER record_core_memory_revision
  BEFORE INSERT OR UPDATE OR DELETE ON public.vanguard_preferences
  FOR EACH ROW EXECUTE FUNCTION public.record_core_memory_revision();

DROP FUNCTION IF EXISTS public.restore_core_memory_revision(uuid, timestamptz);
CREATE OR REPLACE FUNCTION public.restore_core_memory_revision(
  p_revision_id uuid, p_expected_updated_at timestamptz, p_value_side text DEFAULT 'new'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_revision public.vanguard_core_memory_revisions%ROWTYPE;
  v_preference public.vanguard_preferences%ROWTYPE;
  v_value jsonb;
  v_selected_value text;
  v_selected_is_active boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_value_side IS NULL OR p_value_side NOT IN ('old', 'new') THEN
    RAISE EXCEPTION 'Invalid revision value side' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_revision FROM public.vanguard_core_memory_revisions
    WHERE id = p_revision_id AND user_id = v_user_id;
  IF NOT FOUND OR left(v_revision.key, 12) <> 'core_memory:' THEN
    RAISE EXCEPTION 'Revision cannot be restored' USING ERRCODE = '22023';
  END IF;
  v_selected_value := CASE WHEN p_value_side = 'old' THEN v_revision.old_value ELSE v_revision.new_value END;
  v_selected_is_active := CASE WHEN p_value_side = 'old' THEN v_revision.old_is_active ELSE v_revision.new_is_active END;
  IF v_selected_value IS NULL THEN RAISE EXCEPTION 'Revision side has no value' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_preference FROM public.vanguard_preferences
    WHERE id = v_revision.preference_id AND user_id = v_user_id AND key = v_revision.key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Core memory no longer exists' USING ERRCODE = '22023'; END IF;
  IF v_preference.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Core memory changed; refresh before restoring' USING ERRCODE = '40001';
  END IF;
  BEGIN
    v_value := v_selected_value::jsonb;
  EXCEPTION WHEN invalid_text_representation THEN
    IF btrim(v_selected_value) = '' OR btrim(v_selected_value) ~ '^[{\[]' THEN
      RAISE EXCEPTION 'Invalid core memory revision' USING ERRCODE = '22023';
    END IF;
    v_value := NULL; -- Genuine legacy plaintext has no invented TTL.
  END;
  IF v_value IS NOT NULL THEN
    IF jsonb_typeof(v_value) <> 'object' OR jsonb_typeof(v_value->'text') IS DISTINCT FROM 'string'
      OR coalesce(btrim(v_value->>'text'), '') = ''
      OR jsonb_typeof(v_value->'expires_at') IS DISTINCT FROM 'string'
      OR coalesce(btrim(v_value->>'expires_at'), '') = '' THEN
      RAISE EXCEPTION 'Invalid core memory revision' USING ERRCODE = '22023';
    END IF;
    BEGIN
      IF NOT isfinite((v_value->>'expires_at')::timestamptz)
        OR (v_value->>'expires_at')::timestamptz <= clock_timestamp() THEN
        RAISE EXCEPTION 'Expired core memory cannot be restored' USING ERRCODE = '22023';
      END IF;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      RAISE EXCEPTION 'Invalid core memory expiry' USING ERRCODE = '22023';
    END;
  END IF;
  UPDATE public.vanguard_preferences SET value = v_selected_value,
    is_active = v_selected_is_active, updated_at = clock_timestamp()
    WHERE id = v_preference.id AND user_id = v_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_core_memory_revision(uuid, timestamptz, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.restore_core_memory_revision(uuid, timestamptz, text) TO authenticated;
