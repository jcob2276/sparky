import { describe, expect, it } from 'vitest';
import { noteReferenceContext, noteContentAsMarkdown } from './noteReferences';
import type { Note } from './notesApi';

const note = (id: string, extra: Partial<Note> = {}) => ({ id, user_id: 'user', title: id, content: '', is_locked: false, deleted_at: null, ...extra }) as Note;
describe('note references', () => {
  it('resolves renamed targets by ID and finds backlinks without exposing locked or foreign text', () => {
    const current = note('target', { title: 'Nowa nazwa', content: '<a data-note-id="missing">Stara nazwa</a>' });
    const source = note('source', { content: '<a data-note-id="target">Stary tytuł</a><a data-note-id="target">Duplikat</a>' });
    const context = noteReferenceContext(current, [current, source, note('locked', { is_locked: true, content: source.content }), note('foreign', { user_id: 'other', content: source.content })]);
    expect(context.backlinks.map(item => item.id)).toEqual(['source']);
    expect(context.outgoing).toEqual([{ id: 'missing', title: 'Stara nazwa', missing: true }]);
    expect(noteReferenceContext(source, [source, current]).outgoing[0].title).toBe('Nowa nazwa');
  });
  it('keeps portable Markdown references and paragraphs instead of flattening links to text', () => {
    const markdown = noteContentAsMarkdown('<p>Plan <a data-note-id="target">Stary tytuł</a></p><p>Następny krok</p>', new Map([['target', { title: 'Aktualny tytuł', path: 'target.md' }]]));
    expect(markdown).toContain('[Aktualny tytuł](target.md)');
    expect(markdown).toContain('\n\nNastępny krok');
  });
  it('uses an absolute Sparky URL for links in standalone Markdown or share copies', () => {
    const markdown = noteContentAsMarkdown('<a data-note-id="target">Cel</a>');
    const href = markdown.match(/\]\(([^)]+)\)/)?.[1];
    expect(href).toMatch(/^https?:\/\//);
    expect(new URL(href!).origin).toBe(window.location.origin);
    expect(new URL(href!).pathname).toBe('/keep');
    expect(new URL(href!).searchParams.get('note')).toBe('target');
  });
});
