import { safeExecute } from "../../_shared/supabase.ts";

export async function insertFrictionEventIfDetected(
  record: any,
  friction: any,
  supabase: any,
): Promise<number | null> {
  const shouldLog = friction.event_kind !== null && friction.event_kind !== undefined;
  if (!shouldLog) return null;

  const existingFriction = await safeExecute(
    supabase
      .from('friction_events')
      .select('id')
      .eq('stream_record_id', record.id)
      .maybeSingle()
  );

  if (existingFriction) {
    console.log(`[auto-classify] friction_event already exists for stream record: ${record.id}`);
    return null;
  }

  let criticalFields: string[] = [];
  if (friction.event_kind === 'friction_event') {
    criticalFields = ['declared_intention', 'actual_behavior', 'deviation'];
  } else if (friction.event_kind === 'positive_micro_action' || friction.event_kind === 'recovery_event') {
    criticalFields = ['actual_behavior'];
  } else if (friction.event_kind === 'state_observation' || friction.event_kind === 'micro_behavior_observation') {
    criticalFields = ['actual_behavior', 'emotional_state'];
  } else {
    criticalFields = ['actual_behavior'];
  }

  const present = criticalFields.filter(f => {
    const val = friction[f];
    return val && String(val).trim().length > 3;
  });
  const extractionQuality = criticalFields.length > 0
    ? Math.round((present.length / criticalFields.length) * 100)
    : 70;

  const finalStatus = 'raw';
  let dbEventKind = friction.event_kind;
  if (dbEventKind === 'recovery_event') {
    dbEventKind = 'positive_micro_action';
  }

  const dbAllowedEventKinds = [
    'friction_event',
    'positive_micro_action',
    'state_observation',
    'micro_behavior_observation',
    'reflection'
  ];
  if (dbEventKind !== null && !dbAllowedEventKinds.includes(dbEventKind)) {
    console.warn(`[auto-classify] Warning: event_kind '${dbEventKind}' not allowed in DB check constraint. Clamping to null.`);
    dbEventKind = null;
  }

  await safeExecute(
    supabase
      .from('friction_events')
      .insert({
        user_id: record.user_id,
        stream_record_id: record.id,
        occurred_at: record.created_at || new Date().toISOString(),
        raw_text: record.content,
        event_kind: dbEventKind,
        friction_type: friction.friction_type || 'other',
        declared_intention: friction.declared_intention || null,
        actual_behavior: friction.actual_behavior || null,
        deviation: friction.deviation || null,
        immediate_cost: friction.immediate_cost || null,
        emotional_state: friction.emotional_state || null,
        people_involved: Array.isArray(friction.people_involved) && friction.people_involved.length > 0
          ? friction.people_involved
          : typeof friction.people_involved === 'string' && friction.people_involved.length > 0
            ? [friction.people_involved]
            : null,
        location_context: friction.location_context || null,
        confidence_source: 'inferred',
        confidence: null,
        status: finalStatus,
        extraction_quality: extractionQuality,
        parser_version: 'auto-classify-v41',
      })
  );
  console.log(`[auto-classify] friction_event inserted: ${dbEventKind} (raw: ${friction.event_kind}) | ${friction.friction_type} | quality=${extractionQuality}% | status=${finalStatus}`);

  return extractionQuality;
}
