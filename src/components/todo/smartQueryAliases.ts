/**
 * Polish aliases for the smart-query language (`termin:tydzień` === `due:week`).
 * Canonical tokens stay English so saved smart lists keep working; aliases are
 * rewritten before matching and are also used to render human-readable chips.
 */

const KEY_ALIASES: Record<string, string> = {
  termin: 'due',
  priorytet: 'priority',
  sekcja: 'section',
  lista: 'section',
  czas: 'duration',
  zaplanowane: 'scheduled',
  przypomnienie: 'reminder',
};

const VALUE_ALIASES: Record<string, Record<string, string>> = {
  due: { dzis: 'today', dzisiaj: 'today', tydzien: 'week', zalegle: 'overdue', brak: 'none' },
  priority: { pilny: 'urgent', wysoki: 'high', normalny: 'normal', niski: 'low' },
  duration: { krotki: 'short', gleboki: 'deep' },
  scheduled: { tak: 'yes', nie: 'no' },
  reminder: { tak: 'yes', nie: 'no' },
};

const TOKEN_RE = /(\w+):(\S+)/g;

export function foldDiacritics(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function canonicalizeToken(key: string, value: string): { key: string; value: string } {
  const foldedKey = foldDiacritics(key);
  const canonicalKey = KEY_ALIASES[foldedKey] ?? key.toLowerCase();
  const canonicalValue = VALUE_ALIASES[canonicalKey]?.[foldDiacritics(value)] ?? value;
  return { key: canonicalKey, value: canonicalValue };
}

export function normalizeSmartQueryAliases(query: string): string {
  return query.replace(TOKEN_RE, (_full, key: string, value: string) => {
    const token = canonicalizeToken(key, value);
    return `${token.key}:${token.value}`;
  });
}

export interface QueryFilterToken {
  raw: string;
  label: string;
}

const KEY_LABELS: Record<string, string> = {
  due: 'termin', tag: 'tag', priority: 'priorytet', section: 'sekcja', status: 'status',
  duration: 'czas', scheduled: 'zaplanowane', reminder: 'przypomnienie',
};
const VALUE_LABELS: Record<string, string> = {
  today: 'dziś', week: 'tydzień', overdue: 'zaległe', none: 'brak', yes: 'tak', no: 'nie',
  short: 'krótki', deep: 'głęboki', urgent: 'pilny', high: 'wysoki', normal: 'normalny', low: 'niski',
};

/** Extracts `key:value` filter tokens from a query for chip rendering. */
export function extractFilterTokens(query: string): QueryFilterToken[] {
  const tokens: QueryFilterToken[] = [];
  for (const match of query.matchAll(TOKEN_RE)) {
    const canonical = canonicalizeToken(match[1], match[2]);
    if (!(canonical.key in KEY_LABELS)) continue;
    tokens.push({
      raw: match[0],
      label: `${KEY_LABELS[canonical.key]}: ${VALUE_LABELS[canonical.value] ?? canonical.value}`,
    });
  }
  return tokens;
}

export function removeFilterToken(query: string, raw: string): string {
  return query.replace(raw, ' ').replace(/\s+/g, ' ').trim();
}
