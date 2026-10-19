import type { Note } from './notesApi';

function referenceLinks(content: string) {
  return Array.from(new DOMParser().parseFromString(content, 'text/html').querySelectorAll('a[data-note-id]'));
}

export function noteReferenceContext(note: Note, notes: Note[]) {
  const visible = notes.filter(item => item.user_id === note.user_id && !item.deleted_at);
  const byId = new Map(visible.map(item => [item.id, item]));
  const outgoing = new Map<string, { id: string; title: string; missing: boolean }>();
  for (const link of referenceLinks(note.content)) {
    const id = link.getAttribute('data-note-id');
    if (!id) continue;
    const target = byId.get(id);
    outgoing.set(id, { id, title: target?.title || link.textContent?.replace(/^\[\[|\]\]$/g, '') || 'Bez tytułu', missing: !target });
  }
  return {
    outgoing: [...outgoing.values()],
    backlinks: visible.filter(item => item.id !== note.id && !item.is_locked
      && referenceLinks(item.content).some(link => link.getAttribute('data-note-id') === note.id)),
  };
}

const escapeLabel = (text: string) => text.replace(/[\\[\]]/g, '\\$&');
export function noteContentAsMarkdown(content: string, paths = new Map<string, { title: string; path: string }>()) {
  const document = new DOMParser().parseFromString(content, 'text/html');
  for (const link of Array.from(document.querySelectorAll('a[data-note-id]'))) {
    const id = link.getAttribute('data-note-id') ?? '';
    const target = paths.get(id);
    const label = target?.title || link.textContent?.replace(/^\[\[|\]\]$/g, '') || 'Bez tytułu';
    const path = target?.path ?? new URL(`/keep?note=${encodeURIComponent(id)}`, window.location.origin).href;
    link.replaceWith(document.createTextNode(`[${escapeLabel(label)}](${path})`));
  }
  for (const br of Array.from(document.querySelectorAll('br'))) br.replaceWith(document.createTextNode('\n'));
  for (const block of Array.from(document.querySelectorAll('p,div,h1,h2,h3,li,pre,blockquote'))) {
    block.append(document.createTextNode('\n\n'));
  }
  document.querySelectorAll('script,style').forEach(element => element.remove());
  return (document.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}
