/** Linki do plików z Dysku Google: rozpoznanie i adres odtwarzacza osadzonego w aplikacji. */
const FILE_PATH = /^\/file\/d\/([\w-]{10,})/;

export function driveFileId(link: string | null | undefined): string | null {
  if (!link) return null;
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.hostname !== 'drive.google.com' && url.hostname !== 'docs.google.com') return null;
  const fromPath = FILE_PATH.exec(url.pathname)?.[1];
  if (fromPath) return fromPath;
  const id = url.searchParams.get('id');
  return id && /^[\w-]{10,}$/.test(id) ? id : null;
}

/** Odtwarzacz Dysku Google, który działa bez logowania dla plików udostępnionych „każdemu z linkiem”. */
export function drivePreviewUrl(link: string | null | undefined): string | null {
  const id = driveFileId(link);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function isHttpLink(link: string | null | undefined): boolean {
  try { return /^https?:$/.test(new URL((link ?? '').trim()).protocol); } catch { return false; }
}
