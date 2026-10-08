import type { TodoItemRow } from './todo';

// Subjects use existing parent tasks as containers for assignments.
export const STUDY_SUBJECT_CATEGORY = 'study_subject';

export function isStudySubject(item: Pick<TodoItemRow, 'category'>): boolean {
  return item.category === STUDY_SUBJECT_CATEGORY;
}
