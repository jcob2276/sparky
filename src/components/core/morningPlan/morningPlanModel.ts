import type { MorningPlanSlotInput } from '../../../lib/morningPlanApi';
import type { TodoSlot } from './types';

const SLOT_CATEGORIES = ['cialo', 'duch', 'konto', 'general', 'general'] as const;

export function createCustomPlanSlot(title: string, index: number): TodoSlot {
  return {
    id: `custom-${index}`,
    todoId: null,
    title,
    priority: 'normal',
    duration_minutes: 30,
    due_date: null,
    scheduled_time: null,
    status: 'open',
  };
}

export function buildMorningPlanSlots(
  powerList: (TodoSlot | null)[],
): MorningPlanSlotInput[] {
  return powerList.flatMap((task, index) => {
    if (!task?.title.trim()) return [];
    return [{
      slot: index + 1,
      title: task.title.trim(),
      category: SLOT_CATEGORIES[index] ?? 'general',
      todo_id: task.todoId ?? null,
    }];
  });
}
