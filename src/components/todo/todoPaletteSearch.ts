import { foldDiacritics } from './smartQueryAliases';

export interface FuzzyMatch {
  score: number;
  /** Indices into the ORIGINAL text that matched (for highlighting). */
  indices: number[];
}

/** Folds text 1:1 (same length) so indices of the folded string map to the original. */
function foldChars(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 1) out += foldDiacritics(text[i]).charAt(0) || text[i].toLowerCase();
  return out;
}

const isBoundary = (text: string, i: number) => i === 0 || /[\s\-_/.,:;()[\]]/.test(text[i - 1]);

/**
 * Subsequence fuzzy match of one token. Rewards: exact substring, prefix,
 * word starts and consecutive runs. Returns null when the token is not a subsequence.
 */
function matchToken(token: string, haystack: string): FuzzyMatch | null {
  if (!token) return { score: 0, indices: [] };
  const sub = haystack.indexOf(token);
  if (sub !== -1) {
    const indices = Array.from({ length: token.length }, (_, k) => sub + k);
    let score = 100 + token.length * 4;
    if (sub === 0) score += 60;
    else if (isBoundary(haystack, sub)) score += 35;
    score -= Math.min(sub, 30) * 0.5;
    return { score, indices };
  }
  const indices: number[] = [];
  let score = 0;
  let from = 0;
  let prev = -2;
  for (let t = 0; t < token.length; t += 1) {
    const at = haystack.indexOf(token[t], from);
    if (at === -1) return null;
    score += 10;
    if (at === prev + 1) score += 15;
    if (isBoundary(haystack, at)) score += 12;
    score -= Math.min(at - from, 10) * 0.6;
    indices.push(at);
    prev = at;
    from = at + 1;
  }
  // Loose subsequences over long gaps are noise: require a reasonably tight spread.
  const spread = indices[indices.length - 1] - indices[0] + 1;
  if (token.length >= 3 && spread > token.length * 3) return null;
  return { score, indices };
}

/** Matches a (possibly multi-word) query against text; every word must match. */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const tokens = foldChars(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { score: 0, indices: [] };
  const haystack = foldChars(text);
  let score = 0;
  const indices = new Set<number>();
  for (const token of tokens) {
    const match = matchToken(token, haystack);
    if (!match) return null;
    score += match.score;
    match.indices.forEach((i) => indices.add(i));
  }
  return { score, indices: [...indices].sort((a, b) => a - b) };
}

export interface RankableTask {
  id: string;
  title: string;
  tags: string[] | null;
  status: string;
  sectionName: string | null;
  due_date: string | null;
}

export interface RankedTask<T extends RankableTask> {
  task: T;
  score: number;
  titleIndices: number[];
}

const TITLE_WEIGHT = 1;
const TAG_WEIGHT = 0.6;
const SECTION_WEIGHT = 0.4;

/** Ranks tasks by title / tags / section. Open tasks beat done ones at equal relevance. */
export function rankTasks<T extends RankableTask>(query: string, tasks: readonly T[], limit = 8): RankedTask<T>[] {
  if (!query.trim()) return [];
  const ranked: RankedTask<T>[] = [];
  for (const task of tasks) {
    const title = fuzzyMatch(query, task.title);
    let best = title ? title.score * TITLE_WEIGHT : -1;
    for (const tag of task.tags ?? []) {
      const m = fuzzyMatch(query, tag);
      if (m) best = Math.max(best, m.score * TAG_WEIGHT);
    }
    if (task.sectionName) {
      const m = fuzzyMatch(query, task.sectionName);
      if (m) best = Math.max(best, m.score * SECTION_WEIGHT);
    }
    if (best < 0) continue;
    if (task.status === 'done') best -= 40;
    ranked.push({ task, score: best, titleIndices: title?.indices ?? [] });
  }
  ranked.sort((a, b) => b.score - a.score || a.task.title.localeCompare(b.task.title, 'pl'));
  return ranked.slice(0, limit);
}

/** Splits text into highlighted / plain segments given matched indices. */
export function splitByIndices(text: string, indices: readonly number[]): { text: string; hit: boolean }[] {
  if (indices.length === 0) return [{ text, hit: false }];
  const hits = new Set(indices);
  const segments: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const hit = hits.has(i);
    const last = segments[segments.length - 1];
    if (last && last.hit === hit) last.text += text[i];
    else segments.push({ text: text[i], hit });
  }
  return segments;
}
