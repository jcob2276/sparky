import type { LearningAssignment } from '../../../lib/learning/learningModel';

/** Atrapa pozycji planu do testów komponentów nauki. */
export const makeAssignment = (patch: Partial<LearningAssignment> = {}): LearningAssignment => ({
  id: 'a1',
  user_id: 'u1',
  month_start: '2026-10-01',
  link_id: null,
  skill_id: null,
  title: 'Never Split the Difference',
  resource_type: 'book',
  unit: 'pages',
  total: 240,
  done: 40,
  due_date: '2026-10-31',
  status: 'active',
  position: 0,
  completed_at: null,
  created_at: '',
  updated_at: '',
  ...patch,
});
