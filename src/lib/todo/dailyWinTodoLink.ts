export interface DailyWinTodoSlot {
  todoId: string | null;
}

/**
 * Keeps Power List as a daily snapshot: only a Todo explicitly selected by the
 * user is linked. Manual plan entries stay local to that day.
 */
export function resolveDailyWinTodoIds(slots: DailyWinTodoSlot[]): (string | null)[] {
  return slots.map((slot) => slot.todoId);
}
