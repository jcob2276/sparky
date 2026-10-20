export function formatPhoneUsageDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0 min';
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type LateNightImpactTier = 'optimal' | 'mild' | 'moderate' | 'high';

export interface LateNightImpact {
  tier: LateNightImpactTier;
  minutes: number;
  label: string;
  badge: string;
  description: string;
  color: 'text-text-secondary';
  bgColor: string;
}

export function evaluateLateNightImpact(lateNightMinutes: number | null | undefined): LateNightImpact | null {
  if (lateNightMinutes == null || !Number.isFinite(lateNightMinutes) || lateNightMinutes < 0) return null;
  const min = Math.round(lateNightMinutes);
  return {
    tier: min === 0 ? 'optimal' : min <= 20 ? 'mild' : min <= 45 ? 'moderate' : 'high',
    minutes: min,
    label: 'Użycie w oknie nocnym (23:00–04:00)',
    badge: `${min} min`,
    description: `${min} min w przedziałach 00:00–04:00 oraz 23:00–24:00 tego samego dnia (czas Warszawy). Licznik dotyczy wyłącznie tych godzin nocnych — nie obejmuje wcześniejszego wieczoru (np. 20:00–22:59) ani nie mierzy wpływu na sen.`,
    color: 'text-text-secondary',
    bgColor: 'bg-surface-3',
  };
}

export interface PhoneCognitiveProfile {
  toolMinutes: number;
  passiveMinutes: number;
  entertainmentMinutes: number;
  communicationMinutes: number;
  otherMinutes: number;
  toolRatio: number;
  passiveRatio: number;
  entertainmentRatio: number;
  unlocks: number | null;
  unlockIntervalMinutes: number | null;
  avgSessionMinutes: number | null;
  attentionLabel: string;
  attentionTier: 'focused' | 'normal' | 'elevated' | 'fragmented' | 'unknown';
}

export function evaluateCognitiveProfile(input: {
  total_minutes: number | null;
  social_minutes?: number | null;
  messaging_minutes?: number | null;
  entertainment_minutes?: number | null;
  ai_minutes?: number | null;
  browser_minutes?: number | null;
  other_minutes?: number | null;
  unlocks?: number | null;
}): PhoneCognitiveProfile {
  const total = Math.max(0, input.total_minutes ?? 0);
  const ai = Math.max(0, input.ai_minutes ?? 0);
  const browser = Math.max(0, input.browser_minutes ?? 0);
  const social = Math.max(0, input.social_minutes ?? 0);
  const entertainment = Math.max(0, input.entertainment_minutes ?? 0);
  const messaging = Math.max(0, input.messaging_minutes ?? 0);
  const other = Math.max(0, input.other_minutes ?? 0);

  const toolMinutes = ai + browser;
  const passiveMinutes = social + entertainment;
  const communicationMinutes = messaging;

  const toolRatio = total > 0 ? Math.round((toolMinutes / total) * 100) : 0;
  const passiveRatio = total > 0 ? Math.round((passiveMinutes / total) * 100) : 0;
  const entertainmentRatio = total > 0 ? Math.round((entertainment / total) * 100) : 0;

  const unlocks = input.unlocks ?? null;
  let unlockIntervalMinutes: number | null = null;
  let avgSessionMinutes: number | null = null;
  let attentionLabel = 'Brak danych o odblokowaniach';
  let attentionTier: PhoneCognitiveProfile['attentionTier'] = 'unknown';

  if (unlocks != null && unlocks > 0) {
    // Average screen duration per unlock session
    avgSessionMinutes = total > 0 ? Math.max(1, Math.round(total / unlocks)) : 1;
    // Window-based interval (e.g. within screen time window or waking window)
    const windowMinutes = total > 10 ? total : 960;
    unlockIntervalMinutes = Math.max(1, Math.round(windowMinutes / unlocks));
    if (unlocks <= 30) {
      attentionLabel = 'Do 30 odblokowań';
      attentionTier = 'focused';
    } else if (unlocks <= 60) {
      attentionLabel = 'Standardowa częstotliwość sprawdzania';
      attentionTier = 'normal';
    } else if (unlocks <= 100) {
      attentionLabel = '61–100 odblokowań';
      attentionTier = 'elevated';
    } else {
      attentionLabel = 'Ponad 100 odblokowań';
      attentionTier = 'fragmented';
    }
  }

  return {
    toolMinutes,
    passiveMinutes,
    entertainmentMinutes: entertainment,
    communicationMinutes,
    otherMinutes: other,
    toolRatio,
    passiveRatio,
    entertainmentRatio,
    unlocks,
    unlockIntervalMinutes,
    avgSessionMinutes,
    attentionLabel,
    attentionTier,
  };
}
