import { isNativePlatform } from './native/platform';

/**
 * Universal file download & native share helper.
 *
 * In standard desktop browsers, triggers an `<a download>` anchor.
 * In native mobile apps (Capacitor) and standalone mobile PWAs (where `<a download>` on blob:
 * is silently ignored by the WebView / WebKit), leverages Web Share API Level 2 (`navigator.share` with files)
 * so the user can save to files, drive, or share to any app.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const isMobile =
    isNativePlatform() ||
    (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) ||
    (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);

  const file = new File([blob], filename, { type: blob.type || 'text/plain;charset=utf-8' });

  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'AbortError' || /abort|cancel/i.test(error.message))) {
        return;
      }
      // Fall through to traditional anchor download if share fails
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
