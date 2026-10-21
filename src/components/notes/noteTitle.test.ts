import { describe, expect, it } from 'vitest';
import { composeTitle, splitTitle } from './noteTitle';
import { deriveNoteMetadata } from '../../lib/noteText';

describe('noteTitle', () => {
  it('splits a leading heading into title and body', () => {
    expect(splitTitle('<h1>Plan &amp; cele</h1><p>treść</p>')).toEqual({ title: 'Plan & cele', body: '<p>treść</p>' });
  });

  it('treats a short plain first line of a legacy note as the title', () => {
    expect(splitTitle('<p>Krótki tytuł</p><p>reszta</p>')).toEqual({ title: 'Krótki tytuł', body: '<p>reszta</p>' });
  });

  it('keeps a long first paragraph, a todo or a list in the body (no title)', () => {
    const long = `<p>${'a'.repeat(200)}</p>`;
    expect(splitTitle(long)).toEqual({ title: '', body: long });
    const todo = '<div class="keep-todo-item"><span class="keep-todo-checkbox"></span><span class="keep-todo-text">x</span></div>';
    expect(splitTitle(todo).title).toBe('');
    expect(splitTitle('<ul><li>a</li></ul>').title).toBe('');
  });

  it('renders raw markdown first, so "# Tytuł" becomes the title field', () => {
    expect(splitTitle('# Sesja\n**Data:** dziś').title).toBe('Sesja');
  });

  it('composes back with an escaped h1 and the derived title matches the field', () => {
    const html = composeTitle('A <b> & B', '<p>x</p>');
    expect(html).toBe('<h1>A &lt;b&gt; &amp; B</h1><p>x</p>');
    expect(deriveNoteMetadata(html).title).toBe('A <b> & B');
    expect(composeTitle('   ', '<p>x</p>')).toBe('<p>x</p>');
  });

  it('round-trips split → compose without losing the body', () => {
    const source = '<h1>Tytuł</h1><p>jeden</p><ul><li>a</li></ul>';
    const parts = splitTitle(source);
    expect(composeTitle(parts.title, parts.body)).toBe(source);
  });
});
