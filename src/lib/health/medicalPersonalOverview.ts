import { formatMedicalDate, type MarkerSeries } from './medicalAnalytics';

export type PanelFreshnessStatus = 'fresh' | 'aging' | 'stale' | 'missing';

export interface PanelFreshness {
  id: string;
  label: string;
  lastDate: string | null;
  ageDays: number | null;
  markerCount: number;
  status: PanelFreshnessStatus;
}

export type InsightTone = 'good' | 'watch' | 'info';

export interface PersonalInsight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  markerKey: string | null;
}

export interface SupplementRef {
  slug: string;
  name: string;
  active: boolean;
}

const FRESH_DAYS = 180;
const STALE_DAYS = 365;
const TREND_MIN_CHANGE_PCT = 15;
const TREND_MIN_SPAN_DAYS = 30;
const MAX_INSIGHTS = 5;

/** Groups shown in the freshness strip; `category` is the canonical one from `buildMarkerSeries`. */
const PANEL_GROUPS: Array<{ id: string; label: string; category: string }> = [
  { id: 'morfologia', label: 'Morfologia', category: 'Morfologia krwi' },
  { id: 'lipidy', label: 'Lipidogram', category: 'Lipidogram' },
  { id: 'metabolizm', label: 'Glukoza', category: 'Metabolizm i glukoza' },
  { id: 'tarczyca', label: 'Tarczyca', category: 'Tarczyca' },
  { id: 'zelazo', label: 'Żelazo', category: 'Gospodarka żelazem' },
  { id: 'hormony', label: 'Hormony', category: 'Hormony' },
  { id: 'witaminy', label: 'Witaminy', category: 'Witaminy' },
  { id: 'minerały', label: 'Minerały', category: 'Elektrolity i minerały' },
];

/** What a supplement is expected to move, as a lab marker the user can check. */
const SUPPLEMENT_MARKERS: Array<{ test: RegExp; markerKey: string; label: string }> = [
  { test: /\bd3\b|witamin\w*\s*d|\bd-?3\b|vitamin\s*d/i, markerKey: 'vitamin_d_25oh', label: 'witaminy D' },
  { test: /magnez|magnesium/i, markerKey: 'magnesium_serum', label: 'magnezu' },
  { test: /żelaz|zelaz|iron|ferr/i, markerKey: 'ferritin', label: 'ferrytyny' },
];

function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate.slice(0, 10)}T12:00:00Z`).getTime();
  const to = new Date(`${toDate.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function formatAge(ageDays: number): string {
  if (ageDays < 45) return `${ageDays} dni temu`;
  const months = Math.round(ageDays / 30.4);
  if (months < 24) return `${months} mies. temu`;
  return `${Math.floor(months / 12)} lata temu`;
}

function statusForAge(ageDays: number): PanelFreshnessStatus {
  if (ageDays <= FRESH_DAYS) return 'fresh';
  if (ageDays <= STALE_DAYS) return 'aging';
  return 'stale';
}

export function buildPanelFreshness(series: MarkerSeries[], today: string): PanelFreshness[] {
  return PANEL_GROUPS.map((group) => {
    const members = series.filter((s) => s.category === group.category);
    const lastDate = members.reduce<string | null>(
      (latest, s) => (s.latest.result_date > (latest ?? '') ? s.latest.result_date : latest),
      null,
    );
    if (!lastDate) {
      return { id: group.id, label: group.label, lastDate: null, ageDays: null, markerCount: 0, status: 'missing' };
    }
    const ageDays = daysBetween(lastDate, today);
    return { id: group.id, label: group.label, lastDate, ageDays, markerCount: members.length, status: statusForAge(ageDays) };
  });
}

function isOutOfRange(flag: string | null): boolean {
  return !!flag && flag !== 'N' && flag !== 'normal';
}

function inRange(value: number, low: number | null, high: number | null): boolean {
  return (low == null || value >= low) && (high == null || value <= high);
}

function formatValue(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

function trendInsight(series: MarkerSeries): PersonalInsight | null {
  const { latest, prior } = series;
  if (!prior || prior.value === 0) return null;
  if (daysBetween(prior.result_date, latest.result_date) < TREND_MIN_SPAN_DAYS) return null;
  const changePct = ((latest.value - prior.value) / Math.abs(prior.value)) * 100;
  if (Math.abs(changePct) < TREND_MIN_CHANGE_PCT) return null;

  const unit = series.unit ? ` ${series.unit}` : '';
  const sign = changePct > 0 ? '+' : '−';
  const wasIn = inRange(prior.value, prior.ref_low, prior.ref_high);
  const nowIn = inRange(latest.value, latest.ref_low, latest.ref_high);
  const tone: InsightTone = !wasIn && nowIn ? 'good' : wasIn && !nowIn ? 'watch' : 'info';
  const rangeNote = !wasIn && nowIn
    ? 'Wcześniej poza zakresem referencyjnym, teraz w zakresie.'
    : wasIn && !nowIn
      ? 'Wcześniej w zakresie referencyjnym, teraz poza nim.'
      : nowIn ? 'Oba pomiary w zakresie referencyjnym.' : 'Oba pomiary poza zakresem referencyjnym.';

  return {
    id: `trend-${series.marker_key}`,
    tone,
    markerKey: series.marker_key,
    title: `${series.marker_name}: ${formatValue(prior.value)} → ${formatValue(latest.value)}${unit} (${sign}${Math.round(Math.abs(changePct))}%)`,
    detail: `${formatMedicalDate(prior.result_date)} → ${formatMedicalDate(latest.result_date)}. ${rangeNote}`,
  };
}

function outOfRangeInsight(series: MarkerSeries, today: string): PersonalInsight | null {
  if (!isOutOfRange(series.latest.flag)) return null;
  const age = formatAge(daysBetween(series.latest.result_date, today));
  const unit = series.unit ? ` ${series.unit}` : '';
  return {
    id: `range-${series.marker_key}`,
    tone: 'watch',
    markerKey: series.marker_key,
    title: `${series.marker_name}: ${formatValue(series.latest.value)}${unit} poza zakresem laboratorium`,
    detail: `Pomiar z ${formatMedicalDate(series.latest.result_date)} (${age}). To wskazówka do rozmowy z lekarzem, nie diagnoza.`,
  };
}

function supplementInsights(series: MarkerSeries[], supplements: SupplementRef[], today: string): PersonalInsight[] {
  const byKey = new Map(series.map((s) => [s.marker_key, s]));
  const out: PersonalInsight[] = [];
  const seen = new Set<string>();
  for (const supplement of supplements.filter((s) => s.active)) {
    const rule = SUPPLEMENT_MARKERS.find((r) => r.test.test(`${supplement.slug} ${supplement.name}`));
    if (!rule || seen.has(rule.markerKey)) continue;
    seen.add(rule.markerKey);
    const marker = byKey.get(rule.markerKey);
    const ageDays = marker ? daysBetween(marker.latest.result_date, today) : null;
    if (marker && ageDays != null && ageDays <= FRESH_DAYS) continue;
    const last = marker
      ? `Ostatni pomiar ${rule.label}: ${formatValue(marker.latest.value)}${marker.unit ? ` ${marker.unit}` : ''}, ${formatAge(ageDays ?? 0)}.`
      : `Nie masz jeszcze żadnego pomiaru ${rule.label}.`;
    out.push({
      id: `supplement-${rule.markerKey}`,
      tone: 'watch',
      markerKey: marker?.marker_key ?? null,
      title: `Suplementujesz ${supplement.name}, a wynik nie jest świeży`,
      detail: `${last} Kontrola pokaże, czy dawka robi to, co ma.`,
    });
  }
  return out;
}

const TONE_ORDER: Record<InsightTone, number> = { watch: 0, good: 1, info: 2 };

/** Short list of things worth knowing, derived only from the user's own data. */
export function buildPersonalInsights(input: {
  series: MarkerSeries[];
  supplements: SupplementRef[];
  today: string;
}): PersonalInsight[] {
  const all: PersonalInsight[] = [
    ...input.series.map((s) => outOfRangeInsight(s, input.today)),
    ...input.series.map(trendInsight),
    ...supplementInsights(input.series, input.supplements, input.today),
  ].filter((i): i is PersonalInsight => i !== null);

  const seenMarkers = new Set<string>();
  return all
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
    .filter((insight) => {
      // One line per marker: the most urgent wins (list is already sorted by tone).
      const key = insight.markerKey ?? insight.id;
      if (seenMarkers.has(key)) return false;
      seenMarkers.add(key);
      return true;
    })
    .slice(0, MAX_INSIGHTS);
}
