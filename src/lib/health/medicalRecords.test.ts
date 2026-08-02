import { describe, expect, it, vi } from 'vitest';
import {
  buildMedicalTimeline,
  buildMedicalRecordSummary,
  buildPreventionSuggestions,
  parseMedicalEntry,
  type MedicalEvent,
} from './medicalRecords';

describe('parseMedicalEntry', () => {
  it('turns a logopeda note into a reviewable visit draft', () => {
    vi.setSystemTime(new Date('2026-07-29T12:00:00+02:00'));

    expect(parseMedicalEntry('W poniedziałek byłem u logopedy. Ćwiczenia codziennie, kontrola za 3 miesiące.')).toMatchObject({
      eventType: 'visit',
      occurredOn: '2026-07-27',
      specialty: 'Logopedia',
      title: 'Wizyta u logopedy',
      followUpOn: '2026-10-27',
    });

    vi.useRealTimers();
  });
});

describe('buildMedicalTimeline', () => {
  it('combines visits and lab panels without duplicating their results', () => {
    const events: MedicalEvent[] = [{
      id: 'event-1',
      userId: 'user-1',
      eventType: 'visit',
      occurredOn: '2026-07-27',
      title: 'Wizyta u logopedy',
      specialty: 'Logopedia',
      provider: null,
      reason: null,
      summary: 'Ćwiczenia artykulacyjne',
      recommendations: null,
      followUpOn: null,
      sourceText: null,
      createdAt: '2026-07-27T10:00:00Z',
    }];

    expect(buildMedicalTimeline({
      events,
      documents: [],
      labs: [
        { result_date: '2026-07-20', source_name: 'panel-lipiec', marker_name: 'TSH' },
        { result_date: '2026-07-20', source_name: 'panel-lipiec', marker_name: 'Glukoza' },
      ],
    })).toEqual([
      expect.objectContaining({ id: 'event:event-1', kind: 'visit', occurredOn: '2026-07-27' }),
      expect.objectContaining({ id: 'lab:2026-07-20:panel-lipiec', kind: 'lab', detail: '2 wyniki' }),
    ]);
  });
});

describe('buildMedicalRecordSummary', () => {
  it('condenses the timeline into a useful health passport', () => {
    expect(buildMedicalRecordSummary([
      { id: 'event:1', kind: 'visit', occurredOn: '2026-07-27', title: 'Logopeda', detail: null, specialty: 'Logopedia', eventId: '1' },
      { id: 'lab:1', kind: 'lab', occurredOn: '2026-07-20', title: 'Panel', detail: '34 wyniki', specialty: 'Diagnostyka laboratoryjna', eventId: null },
      { id: 'document:1', kind: 'document', occurredOn: '2025-11-02', title: 'USG', detail: null, specialty: null, eventId: null },
    ], '2026-10-27')).toEqual({
      latestOn: '2026-07-27',
      latestLabel: 'Logopeda',
      recordCount: 3,
      specialtyCount: 2,
      specialties: ['Logopedia', 'Diagnostyka laboratoryjna'],
      nextFollowUpOn: '2026-10-27',
    });
  });
});

describe('buildPreventionSuggestions', () => {
  it('suggests a dental check only when no recent dental visit exists', () => {
    const suggestions = buildPreventionSuggestions({
      events: [],
      today: '2026-07-29',
      age: 31,
    });

    expect(suggestions).toContainEqual(expect.objectContaining({
      id: 'dental-check',
      title: 'Kontrola stomatologiczna',
      sourceLabel: 'NFZ — profilaktyka zdrowia jamy ustnej',
    }));

    const withRecentDentist = buildPreventionSuggestions({
      events: [{
        id: 'dentist',
        userId: 'user-1',
        eventType: 'visit',
        occurredOn: '2026-03-01',
        title: 'Dentysta',
        specialty: 'Stomatologia',
        provider: null,
        reason: null,
        summary: null,
        recommendations: null,
        followUpOn: null,
        sourceText: null,
        createdAt: '2026-03-01T10:00:00Z',
      }],
      today: '2026-07-29',
      age: 31,
    });

    expect(withRecentDentist).not.toContainEqual(expect.objectContaining({ id: 'dental-check' }));
  });

  it('turns an explicit follow-up into the highest-confidence suggestion', () => {
    const suggestions = buildPreventionSuggestions({
      events: [{
        id: 'speech',
        userId: 'user-1',
        eventType: 'visit',
        occurredOn: '2026-07-27',
        title: 'Logopeda',
        specialty: 'Logopedia',
        provider: null,
        reason: null,
        summary: null,
        recommendations: null,
        followUpOn: '2026-10-27',
        sourceText: null,
        createdAt: '2026-07-27T10:00:00Z',
      }],
      today: '2026-07-29',
      age: 31,
    });

    expect(suggestions[0]).toMatchObject({
      id: 'follow-up:speech',
      confidence: 'high',
      dueOn: '2026-10-27',
    });
  });
});
