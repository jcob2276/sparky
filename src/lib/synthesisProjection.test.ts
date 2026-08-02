import { describe, expect, it } from 'vitest';
import {
  projectLifeObligations,
  projectHealthspanOpportunities,
  projectHealthspanLevers,
  projectMedicalSuggestions,
  projectOracleRecommendations,
  projectSystemProposals,
  projectTodoItems,
} from './synthesisProjection';

describe('synthesis candidate projection', () => {
  it('turns measured healthspan opportunities into concrete levers', () => {
    const result = projectHealthspanOpportunities([{
      key: 'strength',
      label: 'Trening siłowy',
      score: 35,
      direction: 'opportunity',
      ageImpactYears: 1.4,
      value: 0,
      benchmark: 'minimum 2 dni tygodniowo',
      source: 'sparky',
      measuredAt: '2026-07-29',
      sampleCount: 1,
      confidence: 86,
      quality: 'logged',
    }]);

    expect(result[0]).toMatchObject({
      source: 'healthspan',
      domain: 'training',
      title: 'Zaplanuj 2 sesje siłowe w tym tygodniu',
      confidence: 86,
    });
  });

  it('uses persistent weekly levers and preserves accepted state', () => {
    const result = projectHealthspanLevers([{
      id: 'lever-1',
      contributor_key: 'strength',
      title: 'Siła',
      target_label: '2 sesje oporowe w tygodniu',
      baseline_score: 55,
      target_score: 60,
      actual_score: null,
      status: 'accepted',
      outcome: null,
      week_start: '2026-07-27',
    }]);
    expect(result[0]).toMatchObject({
      source: 'healthspan',
      sourceId: 'lever-1',
      status: 'accepted',
      title: '2 sesje oporowe w tygodniu',
    });
  });

  it('normalizes Todo priority, due date and duration', () => {
    const result = projectTodoItems([{
      id: 'todo-1',
      title: 'Oddaj projekt',
      priority: 'high',
      due_date: '2026-07-29',
      deadline_date: null,
      duration_minutes: 90,
      status: 'pending',
      updated_at: '2026-07-29T08:00:00Z',
    }], '2026-07-29');

    expect(result[0]).toMatchObject({
      id: 'todo:todo-1',
      source: 'todo',
      domain: 'execution',
      urgency: 100,
      effort: 75,
      dueDate: '2026-07-29',
    });
  });

  it('normalizes obligations, proposals and recommendations into one contract', () => {
    const obligations = projectLifeObligations([{
      id: 'obligation-1',
      title: 'Przegląd auta',
      anchor_date: '2026-08-01',
      kind: 'vehicle',
      updated_at: '2026-07-28T12:00:00Z',
    }], '2026-07-29');
    const proposals = projectSystemProposals([{
      id: 'proposal-1',
      title: 'Ogranicz wieczorne odkładanie',
      body: 'Powtarzalne tarcie.',
      proposal_type: 'friction_cluster',
      status: 'pending',
      created_at: '2026-07-28T12:00:00Z',
    }]);
    const recommendations = projectOracleRecommendations([{
      id: 'rec-1',
      recommendation_text: 'Wyciszenie o 23:30',
      related_metric: 'sleep_hours',
      status: 'pending',
      created_at: '2026-07-28T12:00:00Z',
      evaluation_window_days: 7,
      outcome: null,
    }]);

    expect([obligations[0].source, proposals[0].source, recommendations[0].source])
      .toEqual(['obligation', 'system_proposal', 'oracle_recommendation']);
    expect(recommendations[0].domain).toBe('recovery');
  });

  it('keeps medical prevention suggestions actionable without copying their storage', () => {
    const result = projectMedicalSuggestions([{
      id: 'dental-check',
      title: 'Kontrola stomatologiczna',
      reason: 'Brak zapisanej kontroli.',
      dueOn: null,
      confidence: 'medium',
      sourceLabel: 'NFZ',
      sourceUrl: 'https://example.com',
    }], []);

    expect(result[0]).toMatchObject({
      source: 'medical_prevention',
      sourceId: 'dental-check',
      domain: 'medical',
      status: 'candidate',
    });
  });

  it('removes completed and dismissed source records from the active projection', () => {
    expect(projectTodoItems([{
      id: 'done',
      title: 'Gotowe',
      priority: 'normal',
      due_date: null,
      deadline_date: null,
      duration_minutes: 15,
      status: 'completed',
      updated_at: '2026-07-29T08:00:00Z',
    }], '2026-07-29')).toEqual([]);

    expect(projectSystemProposals([{
      id: 'dismissed',
      title: 'Odrzucone',
      body: '',
      proposal_type: 'friction_cluster',
      status: 'dismissed',
      created_at: '2026-07-28T12:00:00Z',
    }])).toEqual([]);
  });
});
