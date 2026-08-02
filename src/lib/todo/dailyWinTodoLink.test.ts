import { describe, expect, it } from 'vitest';
import { resolveDailyWinTodoIds } from './dailyWinTodoLink';

describe('resolveDailyWinTodoIds', () => {
  it('keeps only explicitly selected Todo links and leaves manual slots unlinked', () => {
    expect(resolveDailyWinTodoIds([
      { todoId: 'todo-1' },
      { todoId: null },
    ])).toEqual(['todo-1', null]);
  });
});
