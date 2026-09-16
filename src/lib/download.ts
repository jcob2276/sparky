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

/**
 * Downloads a file from an HTTP/HTTPS URL.
 * Fetches the URL into a Blob and delegates to `downloadBlob` so native mobile / PWA devices
 * can save/share properly, falling back to a direct anchor click on fetch error.
 */
export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    await downloadBlob(blob, filename);
  } catch {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}
