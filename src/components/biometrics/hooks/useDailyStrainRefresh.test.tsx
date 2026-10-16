import { act, renderHook } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '../../../lib/notify';
import { biometricsKeys } from '../../../lib/queryKeys';
import { computeDailyStrain, syncOura, syncStrava } from '../../../lib/syncApi';
import { useDailyStrainRefresh } from './useDailyStrainRefresh';

vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../lib/syncApi', () => ({ syncOura: vi.fn(), syncStrava: vi.fn(), computeDailyStrain: vi.fn() }));

function setup() {
  const client = new QueryClient();
  client.setQueryData(biometricsKeys.dailyStrainOura('owner'), {});
  client.setQueryData(biometricsKeys.ouraHistory30('owner'), []);
  const haptics = { light: vi.fn(), success: vi.fn(), error: vi.fn() };
  return { client, haptics, ...renderHook(() => useDailyStrainRefresh('owner', client, haptics)) };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(syncOura).mockResolvedValue();
  vi.mocked(syncStrava).mockResolvedValue();
  vi.mocked(computeDailyStrain).mockResolvedValue();
});

describe('daily health refresh feedback', () => {
  it('reports partial source failure while recomputing the available data', async () => {
    vi.mocked(syncOura).mockRejectedValue(new Error('offline'));
    const { result, haptics } = setup();
    await act(async () => { await result.current.refresh(); });
    expect(computeDailyStrain).toHaveBeenCalledWith('owner', 2);
    expect(haptics.success).not.toHaveBeenCalled();
    expect(haptics.error).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Oura'), 'error');
  });

  it('invalidates both current metrics and historical views after successful sync', async () => {
    const { result, client, haptics } = setup();
    await act(async () => { await result.current.refresh(); });
    expect(client.getQueryState(biometricsKeys.dailyStrainOura('owner'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(biometricsKeys.ouraHistory30('owner'))?.isInvalidated).toBe(true);
    expect(haptics.success).toHaveBeenCalledOnce();
  });

  it('shows feedback when the final calculation fails', async () => {
    vi.mocked(computeDailyStrain).mockRejectedValue(new Error('write failed'));
    const { result, haptics } = setup();
    await act(async () => { await result.current.refresh(); });
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Nie udało się'), 'error');
    expect(haptics.error).toHaveBeenCalledOnce();
    expect(haptics.success).not.toHaveBeenCalled();
  });

  it('keeps automatic refresh silent even when one source fails', async () => {
    vi.mocked(syncOura).mockRejectedValue(new Error('offline'));
    const { result, haptics } = setup();
    await act(async () => { await result.current.refresh(true); });
    expect(computeDailyStrain).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(haptics.light).not.toHaveBeenCalled();
    expect(haptics.success).not.toHaveBeenCalled();
    expect(haptics.error).not.toHaveBeenCalled();
  });

  it('does not launch overlapping refreshes before React has rendered the busy state', async () => {
    const { result } = setup();
    await act(async () => { await Promise.all([result.current.refresh(), result.current.refresh()]); });
    expect(syncOura).toHaveBeenCalledOnce();
    expect(syncStrava).toHaveBeenCalledOnce();
    expect(computeDailyStrain).toHaveBeenCalledOnce();
  });
});
