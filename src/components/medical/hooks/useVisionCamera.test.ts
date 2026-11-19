import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useVisionCamera } from './useVisionCamera';

it('reports camera failure, allows retry, and releases the recovered stream', async () => {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  const getUserMedia = vi.fn().mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValueOnce(stream);
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  try {
    const { result, unmount } = renderHook(() => useVisionCamera('calibrate'));
    await waitFor(() => expect(result.current.state).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});
