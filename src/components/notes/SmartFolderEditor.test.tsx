// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SmartFolderEditor from './SmartFolderEditor';

describe('SmartFolderEditor', () => {
  it('builds a versioned rule from visible controls', () => {
    const onSave = vi.fn();
    render(<SmartFolderEditor
      allTags={['pilne', 'praca']}
      folders={[]}
      onCancel={vi.fn()}
      onSave={onSave}
    />);

    fireEvent.change(screen.getByLabelText('Nazwa Smart Folderu'), { target: { value: 'Pilne sprawy' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'pilne' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Wszystkie wybrane tagi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz Smart Folder' }));

    expect(onSave).toHaveBeenCalledWith('Pilne sprawy', expect.objectContaining({
      version: 1,
      tags: ['pilne'],
      tagMode: 'all',
    }));
  });
});
