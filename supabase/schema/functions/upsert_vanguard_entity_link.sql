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
