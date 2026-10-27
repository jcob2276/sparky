/**
 * graphEvidence.ts
 * Konsolidacja pamięci grafu po stronie odczytu (bez zapisów do bazy): wpisy z ≥3 niezależnymi obserwacjami
 * to „powtarzalne", reszta (w tym brak informacji o dowodach) to „pojedyncze sygnały" do traktowania jak hipotezy.
 * W bazie ~70% wpisów `fact` ma 1–2 obserwacje z jednego wyciągu LLM, więc sama etykieta `fact` niczego nie dowodzi.
 */

interface GraphFactRow {
  fact_text?: string | null;
  source_entity?: string;
  relation?: string;
  target_entity?: string;
  evidence_count?: number | null;
  learned_at?: string | null;
  last_seen?: string | null;
}

const STRONG_EVIDENCE_MIN = 3;

function factLabel(f: GraphFactRow): string {
  return f.fact_text ? f.fact_text : `${f.source_entity} ${f.relation} ${f.target_entity}`;
}

function tag(f: GraphFactRow): string {
  const parts: string[] = [];
  if (f.evidence_count != null) parts.push(`obserwacji: ${Number(f.evidence_count)}`);
  const when = String(f.learned_at || f.last_seen || '').slice(0, 10);
  if (when) parts.push(`zapisane ${when}`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/** Dzieli fakty na powtarzalne i pojedyncze oraz usuwa duplikaty różniące się tylko wielkością liter/spacjami. */
function partitionByEvidence(facts: GraphFactRow[]): { strong: GraphFactRow[]; weak: GraphFactRow[] } {
  const seen = new Set<string>();
  const strong: GraphFactRow[] = [];
  const weak: GraphFactRow[] = [];
  for (const f of facts) {
    const key = factLabel(f).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    (Number(f.evidence_count ?? 0) >= STRONG_EVIDENCE_MIN ? strong : weak).push(f);
  }
  return { strong, weak };
}

export function formatGraphMemory(facts: GraphFactRow[]): string {
  const { strong, weak } = partitionByEvidence(facts);
  const parts: string[] = [];
  if (strong.length) {
    parts.push(
      `[PAMIĘĆ Z GRAFU — POWTARZALNE (≥${STRONG_EVIDENCE_MIN} obserwacji; nadal obserwacje, nie wyrok)]:\n` +
      strong.map((f) => `- ${factLabel(f)}${tag(f)}`).join('\n'),
    );
  }
  if (weak.length) {
    parts.push(
      '[PAMIĘĆ Z GRAFU — POJEDYNCZE SYGNAŁY (1–2 obserwacje lub brak danych o dowodach): traktuj jak hipotezy, nie mów o nich jak o pewnikach; starsze niż 3 tygodnie to tło]:\n' +
      weak.map((f) => `- ${factLabel(f)}${tag(f)}`).join('\n'),
    );
  }
  return parts.join('\n\n');
}
