import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTodoDerivedViews } from './useTodoDerivedViews';
import type { TodoItemRow, TodoSectionRow } from '../useTodoData';

const task = (patch: Partial<TodoItemRow>): TodoItemRow => ({
  id: 'task', user_id: 'user', title: 'Zadanie', status: 'open', priority: 'normal',
  tags: [], notes: null, ai_bucket: null, ai_classified_at: null, category: null,
  completed_at: null, created_at: '', updated_at: '', deadline_date: null,
  due_date: null, duration_minutes: null, is_important: false, is_milestone: false,
  parent_task_id: null, project_id: null, recurrence: null, recurrence_origin_id: null,
  reminder_at: null, reminder_sent: false, scheduled_time: null, section_id: 'studies',
  sort_order: 0, ...patch,
});
const subject = task({ id: 'subject', title: 'Kryptografia kwantowa', category: 'study_subject' });
const section: TodoSectionRow = {
  id: 'studies', user_id: 'user', name: 'Studia', sort_order: 0,
  is_archived: false, created_at: '', updated_at: '', project_id: null,
};
const views = (items: TodoItemRow[]) => renderHook(() => useTodoDerivedViews({
  items, sections: [section], projects: [], dreams: [], today: '2026-10-08',
  activeFilterSection: null, activeSmartQuery: '',
})).result.current;

describe('study assignments in task views', () => {
  it('shows due assignments in Today and keeps the subject in Studies', () => {
    const assignment = task({ id: 'assignment', parent_task_id: subject.id, due_date: '2026-10-08' });
    const result = views([subject, assignment]);
    expect(result.todayItems.map(i => i.id)).toEqual(['assignment']);
    expect(result.sectionsWithItems[0].items.map(i => i.id)).toEqual(['subject']);
    expect(result.getChildren(subject.id)).toEqual([assignment]);
  });
  it('shows upcoming assignments and completed assignments without counting subjects as tasks', () => {
    const next = task({ id: 'next', parent_task_id: subject.id, due_date: '2026-10-10' });
    const done = task({ id: 'done', parent_task_id: subject.id, status: 'done' });
    const result = views([subject, next, done]);
    expect(result.upcomingItems.map(i => i.id)).toEqual(['next']);
    expect(result.openItems.map(i => i.id)).toEqual(['next']);
    expect(result.doneItems.map(i => i.id)).toEqual(['done']);
    expect(result.sectionsWithItems[0].items.map(i => i.id)).toEqual(['subject']);
  });
  it('keeps ordinary subtasks nested in their existing parent', () => {
    const parent = task({ id: 'parent' });
    const child = task({ id: 'child', parent_task_id: parent.id, due_date: '2026-10-08' });
    const result = views([parent, child]);
    expect(result.todayItems).toEqual([]);
    expect(result.openItems).toEqual([parent]);
    expect(result.getChildren(parent.id)).toEqual([child]);
  });
});
