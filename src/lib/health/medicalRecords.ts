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

export function buildMedicalTimeline(input: {
  events: MedicalEvent[];
  documents: Array<{ id?: string; document_date: string; source_name: string; document_type?: string }>;
  labs: Array<{ result_date: string; source_name: string; marker_name: string }>;
}): MedicalTimelineItem[] {
  const labPanels = new Map<string, { date: string; source: string; count: number }>();
  for (const lab of input.labs) {
    const key = `${lab.result_date}:${lab.source_name}`;
    const panel = labPanels.get(key);
    labPanels.set(key, {
      date: lab.result_date,
      source: lab.source_name,
      count: (panel?.count ?? 0) + 1,
    });
  }

  return [
    ...input.events.map((event): MedicalTimelineItem => ({
      id: `event:${event.id}`,
      kind: event.eventType,
      occurredOn: event.occurredOn,
      title: event.title,
      detail: event.summary,
      specialty: event.specialty,
      eventId: event.id,
    })),
    ...Array.from(labPanels.values()).map((panel): MedicalTimelineItem => ({
      id: `lab:${panel.date}:${panel.source}`,
      kind: 'lab',
      occurredOn: panel.date,
      title: panel.source,
      detail: `${panel.count} ${panel.count === 1 ? 'wynik' : 'wyniki'}`,
      specialty: 'Diagnostyka laboratoryjna',
      eventId: null,
    })),
    ...input.documents.map((document): MedicalTimelineItem => ({
      id: `document:${document.id ?? `${document.document_date}:${document.source_name}`}`,
      kind: 'document',
      occurredOn: document.document_date,
      title: document.source_name,
      detail: document.document_type ?? 'Dokument medyczny',
      specialty: null,
      eventId: null,
    })),
  ].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id));
}

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

export function buildPreventionSuggestions(input: {
  events: MedicalEvent[];
  today: string;
  age: number | null;
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
