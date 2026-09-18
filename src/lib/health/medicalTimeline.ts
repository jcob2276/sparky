import {
  type MedicalEvent,
  type MedicalTimelineItem,
  formatMedicalDocumentType,
} from './medicalRecords';

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
