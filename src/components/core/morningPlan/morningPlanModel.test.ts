import { describe, expect, it } from 'vitest';
import { buildMorningPlanSlots, createCustomPlanSlot } from './morningPlanModel';

describe('free-form morning plan', () => {
  it('creates an empty custom slot without linking it to Todo', () => {
    expect(createCustomPlanSlot('Napiszę ofertę', 2)).toMatchObject({
      id: 'custom-2',
      title: 'Napiszę ofertę',
      todoId: null,
    });
  });

  it('serializes custom entries with a null todo_id and skips blank slots', () => {
    const slots = buildMorningPlanSlots([
      createCustomPlanSlot('Napiszę ofertę', 0),
      null,
      {
        id: 'todo-1',
        todoId: 'todo-1',
        title: 'Telefon do klienta',
        priority: 'high',
        duration_minutes: 30,
        due_date: null,
        scheduled_time: null,
        status: 'open',
      },
    ]);

    expect(slots).toEqual([
      { slot: 1, title: 'Napiszę ofertę', category: 'cialo', todo_id: null },
      { slot: 3, title: 'Telefon do klienta', category: 'konto', todo_id: 'todo-1' },
    ]);
  });
});
