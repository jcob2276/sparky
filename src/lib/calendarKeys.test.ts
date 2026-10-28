import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { calendarKeys } from './queryKeys';

describe('calendarKeys.agenda', () => {
  it('belongs to the calendar family so every calendar mutation refreshes the Today agenda', async () => {
    const client = new QueryClient();
    const agenda = calendarKeys.agenda('u1', '2026-10-28');
    client.setQueryData(agenda, []);

    await client.invalidateQueries({ queryKey: calendarKeys.all });

    expect(client.getQueryState(agenda)?.isInvalidated).toBe(true);
  });

  it('is scoped to a user and a day', () => {
    expect(calendarKeys.agenda('u1', '2026-10-28')).not.toEqual(calendarKeys.agenda('u2', '2026-10-28'));
    expect(calendarKeys.agenda('u1', '2026-10-28')).not.toEqual(calendarKeys.agenda('u1', '2026-10-29'));
  });
});
