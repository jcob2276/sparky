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
        label: 'Raport analityczny',
        badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        description: 'Parametry analityczne i raport uzupełniający',
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

export function buildMedicalTimeline(input: {
  events: MedicalEvent[];
  documents: Array<{
    id?: string;
    document_date: string;
    source_name: string;
    document_type?: string;
    provider?: string | null;
    source_path?: string | null;
    summary?: string | null;
  }>;
  labs: Array<{
    id?: string;
    result_date: string;
    source_name: string;
    marker_name: string;
    marker_key?: string;
    value?: number;
    unit?: string | null;
    flag?: string | null;
    ref_low?: number | null;
    ref_high?: number | null;
    ref_text?: string | null;
    provider?: string | null;
  }>;
}): MedicalTimelineItem[] {
  const labsByKey = new Map<string, typeof input.labs>();
  for (const lab of input.labs) {
    const key = `${lab.result_date}:::${lab.source_name}`;
    const list = labsByKey.get(key) || [];
    list.push(lab);
    labsByKey.set(key, list);
  }

  const consumedLabKeys = new Set<string>();
  const items: MedicalTimelineItem[] = [];

  // 1. Events from medical_events
  for (const event of input.events) {
    items.push({
      id: `event:${event.id}`,
      kind: event.eventType,
      occurredOn: event.occurredOn,
      title: event.title,
      detail: event.summary,
      specialty: event.specialty,
      eventId: event.id,
      provider: event.provider,
      recommendations: event.recommendations,
      summary: event.summary,
    });
  }

  // 2. Documents (merge with labs if matching)
  for (const doc of input.documents) {
    const directKey = `${doc.document_date}:::${doc.source_name}`;
    let matchingLabs = labsByKey.get(directKey);
    let matchedKey = directKey;

    if (!matchingLabs) {
      for (const [k, list] of labsByKey.entries()) {
        const [date, src] = k.split(':::');
        if (date === doc.document_date && (src.includes(doc.source_name) || doc.source_name.includes(src))) {
          matchingLabs = list;
          matchedKey = k;
          break;
        }
      }
    }

    if (matchingLabs && matchingLabs.length > 0) {
      consumedLabKeys.add(matchedKey);
      const sampleNames = matchingLabs.slice(0, 3).map((m) => m.marker_name).join(', ');
      const previewText = matchingLabs.length > 3 ? `${sampleNames}…` : sampleNames;

      items.push({
        id: `doc:${doc.id || directKey}`,
        kind: 'lab',
        occurredOn: doc.document_date,
        title: doc.source_name,
        detail: `${matchingLabs.length} ${matchingLabs.length === 1 ? 'marker' : matchingLabs.length < 5 ? 'markery' : 'markerów'}${previewText ? ` (${previewText})` : ''}`,
        specialty: 'Diagnostyka laboratoryjna',
        eventId: null,
        provider: doc.provider || matchingLabs[0]?.provider || 'Laboratorium',
        documentType: doc.document_type || 'laboratory_report',
        sourcePath: doc.source_path,
        summary: doc.summary,
        labCount: matchingLabs.length,
        labMarkers: matchingLabs.map((m) => ({
          id: m.id,
          markerKey: m.marker_key,
          name: m.marker_name,
          value: Number(m.value ?? 0),
          unit: m.unit ?? null,
          flag: m.flag ?? null,
          refLow: m.ref_low != null ? Number(m.ref_low) : null,
          refHigh: m.ref_high != null ? Number(m.ref_high) : null,
          refText: m.ref_text ?? null,
        })),
      });
    } else {
      const docTypeInfo = formatMedicalDocumentType(doc.document_type);
      items.push({
        id: `doc:${doc.id || directKey}`,
        kind: 'document',
        occurredOn: doc.document_date,
        title: doc.source_name,
        detail: doc.summary || docTypeInfo.description,
        specialty: docTypeInfo.label,
        eventId: null,
        provider: doc.provider,
        documentType: doc.document_type,
        sourcePath: doc.source_path,
        summary: doc.summary,
      });
    }
  }

  // 3. Any remaining unconsumed labs
  for (const [key, labGroup] of labsByKey.entries()) {
    if (!consumedLabKeys.has(key)) {
      const [date, src] = key.split(':::');
      const sampleNames = labGroup.slice(0, 3).map((m) => m.marker_name).join(', ');
      const previewText = labGroup.length > 3 ? `${sampleNames}…` : sampleNames;

      items.push({
        id: `lab:${date}:${src}`,
        kind: 'lab',
        occurredOn: date,
        title: src,
        detail: `${labGroup.length} ${labGroup.length === 1 ? 'marker' : labGroup.length < 5 ? 'markery' : 'markerów'}${previewText ? ` (${previewText})` : ''}`,
        specialty: 'Diagnostyka laboratoryjna',
        eventId: null,
        provider: labGroup[0]?.provider || 'Laboratorium',
        documentType: 'laboratory_report',
        labCount: labGroup.length,
        labMarkers: labGroup.map((m) => ({
          id: m.id,
          markerKey: m.marker_key,
          name: m.marker_name,
          value: Number(m.value ?? 0),
          unit: m.unit ?? null,
          flag: m.flag ?? null,
          refLow: m.ref_low != null ? Number(m.ref_low) : null,
          refHigh: m.ref_high != null ? Number(m.ref_high) : null,
          refText: m.ref_text ?? null,
        })),
      });
    }
  }

  return items.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id));
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
