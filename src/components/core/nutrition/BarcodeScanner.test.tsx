import { render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import BarcodeScanner from './BarcodeScanner';

vi.mock('@zxing/library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@zxing/library')>();
  return {
    ...actual,
    BrowserMultiFormatReader: class {
      decode() {
        return { getText: () => '5901234123457' };
      }
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('opens the rear camera and reports a barcode without BarcodeDetector', async () => {
  vi.stubGlobal('BarcodeDetector', undefined);
  vi.stubGlobal('HTMLMediaElement', Object.assign(class {}, { HAVE_CURRENT_DATA: 2 }));
  vi.spyOn(HTMLVideoElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLVideoElement.prototype, 'readyState', 'get').mockReturnValue(2);
  const stop = vi.fn();
  const stream = Object.assign(new MediaStream(), {
    getVideoTracks: () => [],
    getTracks: () => [{ stop }],
  });
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  const onDetected = vi.fn();

  const { unmount } = render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} loading={false} />);

  await waitFor(() => expect(onDetected).toHaveBeenCalledExactlyOnceWith('5901234123457'));
  expect(getUserMedia).toHaveBeenCalledWith({
    video: expect.objectContaining({ facingMode: 'environment' }),
  });
  unmount();
  expect(stop).toHaveBeenCalledOnce();
});
