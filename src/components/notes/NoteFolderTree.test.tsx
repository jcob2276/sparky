// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NoteFolderNode } from '../../lib/noteFoldersApi';
import NoteFolderTree from './NoteFolderTree';

const child: NoteFolderNode = {
  id: 'child', user_id: 'u1', name: 'Oferty', parent_id: 'root', position: 0,
  created_at: '', updated_at: '', children: [],
};
const tree: NoteFolderNode[] = [{
  id: 'root', user_id: 'u1', name: 'Praca', parent_id: null, position: 0,
  created_at: '', updated_at: '', children: [child],
}];

describe('NoteFolderTree', () => {
  it('exposes nested folders as an accessible tree', () => {
    render(<NoteFolderTree
      tree={tree}
      activeFolderId={null}
      noteCounts={{ root: 2, child: 1 }}
      onSelect={vi.fn()}
      onCreateChild={vi.fn()}
      onRename={vi.fn()}
      onMove={vi.fn()}
      onReorder={vi.fn()}
      onDelete={vi.fn()}
    />);

    expect(screen.getByRole('treeitem', { name: /Praca/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('treeitem', { name: /Oferty/ })).toBeVisible();
  });

  it('offers folder management actions without deleting on menu open', () => {
    const onDelete = vi.fn();
    render(<NoteFolderTree
      tree={tree}
      activeFolderId="root"
      noteCounts={{}}
      onSelect={vi.fn()}
      onCreateChild={vi.fn()}
      onRename={vi.fn()}
      onMove={vi.fn()}
      onReorder={vi.fn()}
      onDelete={onDelete}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Akcje folderu Praca' }));
    expect(screen.getByRole('menuitem', { name: 'Nowy podfolder' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Zmień nazwę' })).toBeVisible();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('offers explicit ordering controls', () => {
    const onReorder = vi.fn();
    render(<NoteFolderTree
      tree={tree}
      activeFolderId={null}
      noteCounts={{}}
      onSelect={vi.fn()}
      onCreateChild={vi.fn()}
      onRename={vi.fn()}
      onMove={vi.fn()}
      onReorder={onReorder}
      onDelete={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Akcje folderu Praca' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Przesuń niżej' }));
    expect(onReorder).toHaveBeenCalledWith(tree[0], 'down');
  });
});
