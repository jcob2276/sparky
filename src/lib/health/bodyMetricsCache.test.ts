import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { statsOverviewKeys } from '../queryKeys';
import { invalidateBodyMetricsConsumers } from './bodyMetricsCache';

const stale = (client: QueryClient, key: QueryKey) => client.getQueryState(key)?.isInvalidated === true;

describe('invalidateBodyMetricsConsumers', () => {
  it('marks every view built on body_metrics as stale after a measurement is saved', async () => {
    const client = new QueryClient();
    const keys: QueryKey[] = [
      ['body-reminders', 'u1'],
      ['dashboard'],
      statsOverviewKeys.forUser('u1'),
      ['body-fat-goal', 'u1'],
    ];
    keys.forEach((key) => client.setQueryData(key, {}));

    await invalidateBodyMetricsConsumers(client, 'u1');

    expect(keys.map((key) => stale(client, key))).toEqual([true, true, true, true]);
  });

  it('leaves other users and unrelated queries untouched', async () => {
    const client = new QueryClient();
    const untouched: QueryKey[] = [statsOverviewKeys.forUser('u2'), ['body-fat-goal', 'u2'], ['todos', 'u1']];
    untouched.forEach((key) => client.setQueryData(key, {}));

    await invalidateBodyMetricsConsumers(client, 'u1');

    expect(untouched.map((key) => stale(client, key))).toEqual([false, false, false]);
  });
});
