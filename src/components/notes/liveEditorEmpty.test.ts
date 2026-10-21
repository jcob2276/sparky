import { afterEach, describe, expect, it } from 'vitest';
import { isLiveEditorEmpty } from './liveEditorEmpty';

function mountEditor(html: string) {
  document.body.innerHTML = `<div class="keep-rich-editor">${html}</div>`;
}

describe('isLiveEditorEmpty', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('is false when no editor is mounted (never discard blindly)', () => {
    expect(isLiveEditorEmpty()).toBe(false);
  });

  it('is true for an empty paragraph or whitespace only', () => {
    mountEditor('<p><br></p>');
    expect(isLiveEditorEmpty()).toBe(true);
    mountEditor('<p>&nbsp; </p>');
    expect(isLiveEditorEmpty()).toBe(true);
  });

  it('is false when there is text not yet saved', () => {
    mountEditor('<p>a</p>');
    expect(isLiveEditorEmpty()).toBe(false);
  });

  it('is false when only the title field is filled', () => {
    document.body.innerHTML = '<input class="keep-note-title" value="Tylko tytuł"><div class="keep-rich-editor"><p><br></p></div>';
    expect(isLiveEditorEmpty()).toBe(false);
    document.body.innerHTML = '<input class="keep-note-title" value="  "><div class="keep-rich-editor"><p><br></p></div>';
    expect(isLiveEditorEmpty()).toBe(true);
  });

  it('is false for notes that contain only media, tables, todos or links', () => {
    for (const html of [
      '<img src="x.png">',
      '<table><tr><td></td></tr></table>',
      '<div class="keep-todo-item"></div>',
      '<a href="https://example.com"></a>',
    ]) {
      mountEditor(html);
      expect(isLiveEditorEmpty()).toBe(false);
    }
  });
});
