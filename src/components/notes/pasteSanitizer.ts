/** Tags that keep their meaning when pasted; everything else is unwrapped to its text. */
const KEEP = new Set([
  'p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
]);
/** Tags whose content must never reach the note (scripts, trackers, embeds). */
const DROP = new Set(['script', 'style', 'meta', 'link', 'iframe', 'object', 'embed', 'svg', 'img', 'head', 'title', 'noscript', 'form', 'input', 'button']);
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

function appendClean(source: Node, target: Node, doc: Document): void {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ''));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return; // comments (e.g. Word fragments) are dropped
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP.has(tag)) return;
    if (!KEEP.has(tag)) { appendClean(el, target, doc); return; }
    const copy = doc.createElement(tag);
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? '';
      if (SAFE_HREF.test(href)) {
        copy.setAttribute('href', href);
        copy.setAttribute('target', '_blank');
        copy.setAttribute('rel', 'noreferrer noopener');
      }
    }
    appendClean(el, copy, doc);
    target.appendChild(copy);
  });
}

/**
 * Pasted HTML carries the source's fonts, colours and backgrounds (a white background is unreadable in dark mode).
 * Keep structure and links only: no style, class or other attributes survive.
 */
export function sanitizePastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const out = document.implementation.createHTMLDocument('');
  const holder = out.createElement('div');
  appendClean(parsed.body, holder, out);
  return holder.innerHTML;
}
