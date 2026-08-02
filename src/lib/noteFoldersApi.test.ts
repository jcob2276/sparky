import { describe, expect, it } from 'vitest';
import type { NoteFolder } from './noteFoldersApi';
import { assertValidFolderMove, buildFolderTree } from './noteFoldersApi';

const folder = (
  id: string,
  parentId: string | null,
  position: number,
): NoteFolder => ({
  id,
  user_id: 'user-1',
  name: id,
  parent_id: parentId,
  position,
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
});

describe('note folder hierarchy', () => {
  const folders = [
    folder('second', null, 2),
    folder('child', 'root', 0),
    folder('root', null, 1),
    folder('grandchild', 'child', 0),
  ];

  it('builds a position-sorted tree', () => {
    const tree = buildFolderTree(folders);
    expect(tree.map(node => node.id)).toEqual(['root', 'second']);
    expect(tree[0].children[0].id).toBe('child');
    expect(tree[0].children[0].children[0].id).toBe('grandchild');
  });

  it('rejects moving a folder into itself or its descendants', () => {
    expect(() => assertValidFolderMove(folders, 'root', 'root')).toThrow(
      'Folder nie może być własnym rodzicem.',
    );
    expect(() => assertValidFolderMove(folders, 'root', 'grandchild')).toThrow(
      'Folder nie może trafić do własnego podfolderu.',
    );
  });

  it('allows moving a folder to an unrelated branch or root', () => {
    expect(() => assertValidFolderMove(folders, 'child', 'second')).not.toThrow();
    expect(() => assertValidFolderMove(folders, 'child', null)).not.toThrow();
  });
});
