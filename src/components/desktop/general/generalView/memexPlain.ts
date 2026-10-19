import type { GeneralViewCuriosity } from '../hooks/useGeneralViewData';

const PATTERN_LABELS: Record<string, string> = {
  sleep_disruption: 'Telefon kosztem snu',
  self_control_break: 'Utrata kontroli nad impulsem',
  social_hesitation: 'Wahanie w sytuacjach społecznych',
  avoidance_state: 'Dni unikania',
  avoidance: 'Unikanie kontaktu',
};

const PREFIX = /^\s*\[[^\]]*\]\s*([a-z_]+)\s*(?:x\d+)?\s*:?\s*/i;

export interface PlainHypothesis {
  key: string;
  title: string;
  detail: string | null;
  provocation: string | null;
  confidence: number;
  evidence: number;
}

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/sleep_disruption/gi, 'zaburzenie snu'],
  [/self_control_break/gi, 'utrata kontroli'],
  [/social_hesitation/gi, 'wahanie społeczne'],
  [/avoidance_state/gi, 'unikanie'],
  [/execution_score/gi, 'wskaźnik wykonania'],
  [/friction_events/gi, 'zapisane tarcia'],
];

function plainText(text: string | null): string | null {
  if (!text) return text;
  return TEXT_REPLACEMENTS.reduce((acc, [pattern, label]) => acc.replace(pattern, label), text);
}

function humanize(key: string): string {
  return PATTERN_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Zamienia surowe wpisy z pamięci systemu na zdania po polsku i łączy powtórzenia tego samego wzorca w jeden wpis. */
export function groupHypotheses(items: GeneralViewCuriosity[]): PlainHypothesis[] {
  const groups = new Map<string, PlainHypothesis>();
  for (const item of items) {
    const raw = item.hypothesis ?? '';
    const match = PREFIX.exec(raw);
    const key = match ? match[1].toLowerCase() : raw.toLowerCase().trim().slice(0, 40);
    if (!key) continue;
    const detail = match ? raw.slice(match[0].length).trim() : null;
    const existing = groups.get(key);
    const confidence = item.confidence_score ?? 0;
    const evidence = item.evidence_count ?? 0;
    if (!existing) {
      groups.set(key, {
        key,
        title: match ? humanize(key) : raw,
        detail: plainText(detail || null),
        provocation: plainText(item.provocation),
        confidence,
        evidence: Math.max(evidence, 1),
      });
    } else {
      existing.confidence = Math.max(existing.confidence, confidence);
      existing.evidence += Math.max(evidence, 1);
      if (!existing.provocation) existing.provocation = plainText(item.provocation);
    }
  }
  const seenProvocations = new Set<string>();
  return [...groups.values()]
    .sort((a, b) => b.confidence * Math.log(b.evidence + 1) - a.confidence * Math.log(a.evidence + 1))
    .map((g) => {
      if (g.provocation && seenProvocations.has(g.provocation)) return { ...g, provocation: null };
      if (g.provocation) seenProvocations.add(g.provocation);
      return g;
    });
}

export function confidenceWord(confidence: number): string {
  if (confidence >= 0.8) return 'Pewne';
  if (confidence >= 0.6) return 'Prawdopodobne';
  return 'Do sprawdzenia';
}
