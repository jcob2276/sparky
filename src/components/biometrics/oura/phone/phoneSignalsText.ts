import type {
  OuraOutcomeKey,
  PhoneSleepCorrelation,
  PhoneSleepMetricKey,
  PlaceSource,
} from '@vanguard/domain';

export function hm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export const CONFIDENCE_LABEL = {
  high: 'wysoka pewność',
  medium: 'średnia pewność',
  low: 'niska pewność',
} as const;

export const INTERRUPTION_LEVEL_LABEL = {
  quiet: 'spokojnie',
  moderate: 'umiarkowanie',
  heavy: 'dużo',
} as const;

export const PLACE_SOURCE_LABEL: Record<PlaceSource, string> = {
  'gps+wifi': 'GPS + Wi-Fi',
  gps: 'GPS',
  wifi: 'tylko Wi-Fi (szacunek)',
  none: 'brak danych',
};

const METRIC_LABEL: Record<PhoneSleepMetricKey, string> = {
  screenAfter22: 'Ekran po 22:00',
  eveningLux: 'Światło wieczorem',
  eveningBrightness: 'Jasność ekranu wieczorem',
};

const OUTCOME_LABEL: Record<OuraOutcomeKey, string> = {
  sleepScore: 'wynik snu Oura',
  sleepHours: 'czas snu Oura',
};

export function correlationTitle(c: PhoneSleepCorrelation): string {
  return `${METRIC_LABEL[c.metric]} → ${OUTCOME_LABEL[c.outcome]}`;
}

export function correlationVerdict(c: PhoneSleepCorrelation): string {
  const direction = c.r < 0 ? 'więcej = gorzej' : 'więcej = lepiej';
  if (c.verdict === 'clear') return `wyraźny związek (${direction})`;
  if (c.verdict === 'hint') return `wskazówka (${direction})`;
  return 'brak wyraźnego związku';
}

export function signedMin(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value} min`;
}
