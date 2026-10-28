import type { QueryClient } from '@tanstack/react-query';
import { statsOverviewKeys } from '../queryKeys';

export const BODY_REMINDERS_KEY = 'body-reminders';

/** Każdy zapis `body_metrics` odświeża wszystkie widoki oparte na tej tabeli, niezależnie od ekranu, z którego pochodzi. */
export function invalidateBodyMetricsConsumers(client: QueryClient, userId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: [BODY_REMINDERS_KEY, userId] }),
    client.invalidateQueries({ queryKey: ['dashboard'] }),
    client.invalidateQueries({ queryKey: statsOverviewKeys.forUser(userId) }),
    client.invalidateQueries({ queryKey: ['body-fat-goal', userId] }),
  ]);
}
