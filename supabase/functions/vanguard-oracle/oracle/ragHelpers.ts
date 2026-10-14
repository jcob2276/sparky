export function avg(items: any[] = [], key: string) {
  const values = items.map((item) => item?.[key])
    .filter(value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean')
    .map(Number).filter(Number.isFinite);
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

export function truncateToBudget(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[WARNING: Zawartość skrócona ze względu na limit budżetu tokenów.]";
}

export function buildGraphSeeds(query = '', intent = 'open_reflection', mentionedEntities: string[] = []) {
  const q = query.toLowerCase();
  const seeds = new Set<string>((mentionedEntities || []).filter(Boolean));
  const selfReference = /\b(ja|mnie|mi|moje|moja|moj|u mnie|o mnie|mój)\b/.test(q);
  const broadSelfIntent = ['identity', 'person', 'recent_pattern', 'biometric', 'open_reflection'].includes(intent);

  if (selfReference || broadSelfIntent) {
    seeds.add('Jakub');
  }

  return Array.from(seeds);
}

export function classifyIntentSafe(query = '') {
  const q = query.toLowerCase();
  if (/wiek|urodzin|studi|kim jestem|fundament|identity|tozsamosc|tożsamość/.test(q)) return 'identity';
  if (/jul|toman|tomań|ekiert|klaud|pawel|paweł|osob|relac|dziewczyn|babci|rodzin/.test(q)) return 'person';
  if (/sen|hrv|oura|execution|biometr|tetno|tętno|recovery|krok|kalor|jedz|jem|białk|bialk|śpi|spi|zmęcz|zmecz/.test(q)) return 'biometric';
  if (/ostatnio|7 dni|trend|history|wzorzec|schemat|powtarza|powtarzaln|dlaczego znowu|co się dzieje z/.test(q)) return 'recent_pattern';
  return 'open_reflection';
}
