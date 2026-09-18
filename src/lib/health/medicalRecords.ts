type MedicalEventType = 'visit' | 'lab' | 'procedure' | 'vaccination' | 'other';

export interface MedicalEvent {
  id: string;
  userId: string;
  eventType: MedicalEventType;
  occurredOn: string;
  title: string;
  specialty: string | null;
  provider: string | null;
  reason: string | null;
  summary: string | null;
  recommendations: string | null;
  followUpOn: string | null;
  sourceText: string | null;
  createdAt: string;
}

export type MedicalEventDraft = Omit<MedicalEvent, 'id' | 'userId' | 'createdAt'>;

export interface MedicalTimelineItem {
  id: string;
  kind: MedicalEventType | 'document';
  occurredOn: string;
  title: string;
  detail: string | null;
  specialty: string | null;
  eventId: string | null;
  provider?: string | null;
  documentType?: string | null;
  sourcePath?: string | null;
  summary?: string | null;
  recommendations?: string | null;
  labCount?: number;
  labMarkers?: Array<{
    id?: string;
    markerKey?: string;
    name: string;
    value: number;
    unit: string | null;
    flag: string | null;
    refLow: number | null;
    refHigh: number | null;
    refText: string | null;
  }>;
}

export function formatMedicalDocumentType(documentType?: string | null): { label: string; badgeColor: string; description: string } {
  switch (documentType) {
    case 'laboratory_report':
    case 'processed':
      return {
        label: 'Badania laboratoryjne',
        badgeColor: 'bg-primary/10 text-primary border-primary/20',
        description: 'Pakiet wyników krwi i parametrów laboratoryjnych',
      };
    case 'visit':
      return {
        label: 'Konsultacja lekarska',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        description: 'Wizyta specjalistyczna i zalecenia lekarskie',
      };
    case 'laryngoscopy_images':
    case 'imaging':
      return {
        label: 'Badanie endoskopowe / USG',
        badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        description: 'Obrazowanie diagnostyczne i dokumentacja laryngologiczna',
      };
    case 'body_composition_bia':
      return {
        label: 'Analiza składu ciała (BIA)',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        description: 'Pomiar impedancji bioelektrycznej (waga, tkanka tłuszczowa, mięśnie)',
      };
    case 'hematology_referral':
      return {
        label: 'Skierowanie hematologiczne',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        description: 'Zlecenie diagnostyki i wywiad lekarski',
      };
    case 'non_clinical_analysis_report':
      return {
        label: 'Raport nielaboratoryjny / Biorezonans',
        badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        description: 'Pomiary z analizatorów pozamedycznych (spoza diagnostyki laboratoryjnej EBM)',
      };
    default:
      return {
        label: 'Dokumentacja medyczna',
        badgeColor: 'bg-surface-2 text-text-secondary border-border-custom',
        description: 'Zarejestrowana dokumentacja zdrowotna',
      };
  }
}

export interface PreventionSuggestion {
  id: string;
  title: string;
  reason: string;
  dueOn: string | null;
  confidence: 'high' | 'medium';
  sourceLabel: string;
  sourceUrl: string;
}

export interface MedicalRecordSummary {
  latestOn: string | null;
  latestLabel: string | null;
  recordCount: number;
  specialtyCount: number;
  specialties: string[];
  nextFollowUpOn: string | null;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonths(dateKeyValue: string, months: number): string {
  const [year, month, day] = dateKeyValue.split('-').map(Number);
  const date = new Date(year, month - 1 + months, day, 12);
  return dateKey(date);
}

function previousWeekday(now: Date, weekday: number): Date {
  const copy = new Date(now);
  const delta = (copy.getDay() - weekday + 7) % 7 || 7;
  copy.setDate(copy.getDate() - delta);
  return copy;
}

export function parseMedicalEntry(text: string, now = new Date()): MedicalEventDraft {
  const normalized = text.toLocaleLowerCase('pl-PL');
  const isSpeech = /logoped/.test(normalized);
  const isDental = /dentyst|stomatolog/.test(normalized);
  const occurredOn = /poniedzia[łl]/.test(normalized)
    ? dateKey(previousWeekday(now, 1))
    : dateKey(now);
  const followUpMatch = normalized.match(/kontrol[^\d]*(?:za\s+)?(\d+)\s*(mies|miesią)/);
  const specialty = isSpeech ? 'Logopedia' : isDental ? 'Stomatologia' : null;
  const specialistLabel = isSpeech ? 'logopedy' : isDental ? 'dentysty' : 'specjalisty';

  return {
    eventType: 'visit',
    occurredOn,
    title: `Wizyta u ${specialistLabel}`,
    specialty,
    provider: null,
    reason: null,
    summary: text.trim(),
    recommendations: null,
    followUpOn: followUpMatch ? addMonths(occurredOn, Number(followUpMatch[1])) : null,
    sourceText: text.trim(),
  };
}

export { buildMedicalTimeline } from './medicalTimeline';

export function buildMedicalRecordSummary(
  timeline: MedicalTimelineItem[],
  nextFollowUpOn: string | null,
): MedicalRecordSummary {
  const specialties = Array.from(new Set(
    timeline.map((item) => item.specialty).filter((value): value is string => !!value),
  ));
  return {
    latestOn: timeline[0]?.occurredOn ?? null,
    latestLabel: timeline[0]?.title ?? null,
    recordCount: timeline.length,
    specialtyCount: specialties.length,
    specialties: specialties.slice(0, 4),
    nextFollowUpOn,
  };
}

function monthsBetween(older: string, newer: string): number {
  const [olderYear, olderMonth] = older.split('-').map(Number);
  const [newerYear, newerMonth] = newer.split('-').map(Number);
  return (newerYear - olderYear) * 12 + newerMonth - olderMonth;
}

export interface PreventionActionLike {
  suggestionKey: string;
  status: 'done' | 'snoozed' | 'dismissed';
  snoozedUntil: string | null;
}

/**
 * Czy decyzja użytkownika o sugestii nadal ją ukrywa.
 * Snooze kończy się w dniu `snoozedUntil` (sugestia wraca tego dnia).
 * Pojedyncze źródło prawdy dla Kartoteki i warstwy syntezy.
 */
export function isPreventionActionActive(action: PreventionActionLike, today: string): boolean {
  if (action.status === 'done' || action.status === 'dismissed') return true;
  if (action.status === 'snoozed' && action.snoozedUntil && action.snoozedUntil > today) return true;
  return false;
}

export function filterVisibleSuggestions<T extends { id: string }>(
  suggestions: T[],
  actions: PreventionActionLike[],
  today: string,
): T[] {
  const hidden = new Set(
    actions
      .filter((action) => isPreventionActionActive(action, today))
      .map((action) => action.suggestionKey),
  );
  return suggestions.filter((suggestion) => !hidden.has(suggestion.id));
}

export function buildPreventionSuggestions(input: {
  events: MedicalEvent[];
  today: string;
  age: number | null;
  labs?: Array<{ marker_key?: string; marker_name?: string; result_date?: string; flag?: string | null }>;
}): PreventionSuggestion[] {
  const followUps = input.events
    .filter((event) => event.followUpOn && event.followUpOn >= input.today)
    .map((event): PreventionSuggestion => ({
      id: `follow-up:${event.id}`,
      title: `Kontrola: ${event.specialty ?? event.title}`,
      reason: `Termin zapisany podczas zdarzenia „${event.title}”.`,
      dueOn: event.followUpOn,
      confidence: 'high',
      sourceLabel: 'Twoje zalecenie po wizycie',
      sourceUrl: '',
    }));

  const latestDental = input.events.find((event) =>
    event.specialty?.toLocaleLowerCase('pl-PL').includes('stomatolog'));
  const dentalIsRecent = latestDental && monthsBetween(latestDental.occurredOn, input.today) < 12;
  const preventive: PreventionSuggestion[] = [];

  // Lab-driven preventive alerts (Lipids & CBC outdated check)
  if (input.labs && input.labs.length > 0) {
    const lipidLabs = input.labs.filter((l) => /cholesterol|ldl|hdl|triglycer/i.test(l.marker_key || l.marker_name || ''));
    const latestLipid = lipidLabs.sort((a, b) => (b.result_date || '').localeCompare(a.result_date || ''))[0];
    if (latestLipid?.result_date && monthsBetween(latestLipid.result_date, input.today) >= 12) {
      preventive.push({
        id: 'lipid-panel-check',
        title: 'Kontrola profilu lipidowego (ApoB / Lipidogram)',
        reason: `Ostatni pełny lipidogram wykonano ${latestLipid.result_date} (${monthsBetween(latestLipid.result_date, input.today)} mies. temu). Poprzednie wartości LDL/Nie-HDL przekraczały cele prewencji sercowo-naczyniowej.`,
        dueOn: null,
        confidence: 'high',
        sourceLabel: 'Wytyczne PTL/ESC — prewencja kardiologiczna',
        sourceUrl: 'https://ptlipid.pl/',
      });
    }

    const cbcLabs = input.labs.filter((l) => /neutro|limfo|leuko|morfolog|pdw/i.test(l.marker_key || l.marker_name || ''));
    const latestCbc = cbcLabs.sort((a, b) => (b.result_date || '').localeCompare(a.result_date || ''))[0];
    if (latestCbc?.result_date && monthsBetween(latestCbc.result_date, input.today) >= 12) {
      preventive.push({
        id: 'cbc-morphology-check',
        title: 'Morfologia krwi obwodowej z rozmazem (5-diff)',
        reason: `Ostatnia pełna morfologia pochodzi z ${latestCbc.result_date}. Badania z sierpnia 2026 obejmowały wyłącznie hormony i ferrytynę.`,
        dueOn: null,
        confidence: 'medium',
        sourceLabel: 'Profilaktyka laboratoryjna',
        sourceUrl: 'https://pacjent.gov.pl/',
      });
    }
  }

  if (!dentalIsRecent) {
    preventive.push({
      id: 'dental-check',
      title: 'Kontrola stomatologiczna',
      reason: latestDental
        ? `Ostatnia zapisana kontrola: ${latestDental.occurredOn}.`
        : 'W Kartotece nie ma zapisanej kontroli stomatologicznej.',
      dueOn: null,
      confidence: 'medium',
      sourceLabel: 'NFZ — profilaktyka zdrowia jamy ustnej',
      sourceUrl: 'https://www.nfz.gov.pl/dla-pacjenta/programy-profilaktyczne/',
    });
  }

  if (input.age != null && input.age >= 20) {
    preventive.push({
      id: 'adult-health-balance',
      title: 'Bilans „Moje Zdrowie”',
      reason: 'Program profilaktyczny jest dostępny dla osób od 20. roku życia; zakres badań ustala ankieta i POZ.',
      dueOn: null,
      confidence: 'medium',
      sourceLabel: 'Pacjent.gov.pl — program Moje Zdrowie',
      sourceUrl: 'https://pacjent.gov.pl/program-moje-zdrowie',
    });
  }

  return [...followUps, ...preventive].slice(0, 4);
}
