/**
 * Notatki wklejone/zaimportowane jako surowy markdown (bez tagów HTML) pokazujemy jako sformatowany tekst.
 * Tylko do wyświetlania: zapis w bazie zmienia się dopiero, gdy użytkownik sam coś edytuje.
 */

const HAS_HTML_TAG = /<\/?[a-z][\s\S]*?>/i;
const BLOCK_MARKERS = /^(?:#{1,6}\s+\S|[-*+]\s+\S|\d+[.)]\s+\S|>\s?\S|-{3,}\s*$)/m;
const INLINE_MARKERS = /\*\*[^*\n]+\*\*|__[^_\n]+__/;

export function looksLikeMarkdown(content: string): boolean {
  if (!content || HAS_HTML_TAG.test(content)) return false;
  return BLOCK_MARKERS.test(content) || INLINE_MARKERS.test(content);
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, (_m, a: string | undefined, b: string | undefined) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

export function markdownToHtml(content: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (heading) {
      closeList();
      out.push(`<h${Math.min(heading[1].length, 3)}>${inline(heading[2])}</h${Math.min(heading[1].length, 3)}>`);
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
    } else if (/^-{3,}$/.test(line.trim())) {
      closeList();
      out.push('<hr>');
    } else if (quote) {
      closeList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
    } else if (!line.trim()) {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

/** Treść do wyświetlenia: markdown → HTML, a gotowy HTML bez zmian. */
export function toDisplayHtml(content: string): string {
  return looksLikeMarkdown(content) ? markdownToHtml(content) : content;
}

/** Karta już pokazuje tytuł, więc pierwszy nagłówek o tej samej treści jest zbędny. */
export function dropLeadingTitle(html: string, title: string): string {
  const match = /^<h[1-3]>(.*?)<\/h[1-3]>/.exec(html);
  if (!match || !title.trim()) return html;
  const normalize = (value: string) => stripMarkdown(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  return normalize(match[1].replace(/<[^>]+>/g, '')) === normalize(title) ? html.slice(match[0].length) : html;
}

/** Zwykły tekst bez znaczników markdown — do krótkich podglądów na liście. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, (_m, a: string | undefined, b: string | undefined) => a ?? b ?? '')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}
