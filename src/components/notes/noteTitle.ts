import { toDisplayHtml } from './markdownLite';

/**
 * Tytuł notatki to pierwsza linia treści (deriveNoteMetadata), a stary format zapisuje go jako <h1>.
 * Edytor pokazuje go jako osobne pole: rozdzielamy treść na tytuł i resztę, a przy zapisie składamy z powrotem.
 */
export interface NoteParts {
  title: string;
  body: string;
}

const MAX_TITLE_LENGTH = 120;
const LEADING_HEADING = /^\s*<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i;
const LEADING_BLOCK = /^\s*<(p|div)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/i;

const decode = (value: string) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&amp;/gi, '&');

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function splitTitle(raw: string): NoteParts {
  const html = toDisplayHtml(raw ?? '');
  const heading = LEADING_HEADING.exec(html);
  if (heading) {
    return { title: decode(heading[1].replace(/<[^>]+>/g, '')).trim(), body: html.slice(heading[0].length) };
  }
  const block = LEADING_BLOCK.exec(html);
  if (block && !/<(?:br|img|table|ul|ol|div|p|li)\b/i.test(block[2]) && !/keep-todo/.test(block[0])) {
    const title = decode(block[2].replace(/<[^>]+>/g, '')).trim();
    if (title && title.length <= MAX_TITLE_LENGTH) return { title, body: html.slice(block[0].length) };
  }
  return { title: '', body: html };
}

export function composeTitle(title: string, body: string): string {
  const trimmed = title.trim();
  return trimmed ? `<h1>${escape(trimmed)}</h1>${body}` : body;
}
