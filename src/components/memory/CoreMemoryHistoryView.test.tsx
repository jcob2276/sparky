import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CoreMemoryHistoryView from './CoreMemoryHistoryView';

afterEach(cleanup);

it('shows real before/after text and restores only a usable previous version', () => {
  const revision = { id: 'revision', preference_id: 'preference', key: 'core_memory:focus', operation: 'update' as const,
    old_value: 'Pierwszy priorytet', new_value: 'Poprzedni priorytet', old_is_active: true, new_is_active: true, changed_at: '2026-10-18T10:00:00Z' };
  const onRestore = vi.fn();
  render(<CoreMemoryHistoryView expanded onExpand={vi.fn()} current={[{ id: 'preference', key: revision.key, value: 'Nowy priorytet', is_active: true, updated_at: '2026-10-19T10:00:00Z' }]}
    revisions={[revision, { ...revision, id: 'expired', new_value: '{"text":"Wygasły priorytet","expires_at":"2000-01-01T00:00:00Z"}' }]}
    loading={false} error={null} hasMore={false} onLoadMore={vi.fn()} onRefresh={vi.fn()} restoring={false} restored={false} onRestore={onRestore} />);
  expect(screen.getAllByText('Poprzednio: Pierwszy priorytet')).toHaveLength(2);
  expect(screen.getByText('Wygasły priorytet')).toBeTruthy();
  const restoreButtons = screen.getAllByRole('button', { name: 'Przywróć tę wersję' });
  expect(restoreButtons).toHaveLength(1);
  fireEvent.click(restoreButtons[0]);
  expect(onRestore).toHaveBeenCalledWith(revision, 'new');
});

it('can restore the old side of the first tracked update to an existing memory block', () => {
  const revision = { id: 'first-update', preference_id: 'existing', key: 'core_memory:focus', operation: 'update' as const,
    old_value: '{"text":"Przed zmianą","expires_at":"2999-01-01T00:00:00Z"}', new_value: 'Po zmianie',
    old_is_active: false, new_is_active: true, changed_at: '2026-10-18T10:00:00Z' };
  const onRestore = vi.fn();
  render(<CoreMemoryHistoryView expanded onExpand={vi.fn()} current={[{ id: 'existing', key: revision.key, value: revision.new_value, is_active: true, updated_at: '2026-10-19T10:00:00Z' }]}
    revisions={[revision]} loading={false} error={null} hasMore={false} onLoadMore={vi.fn()} onRefresh={vi.fn()}
    restoring={false} restored={false} onRestore={onRestore} />);
  expect(screen.queryByRole('button', { name: 'Przywróć tę wersję' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Przywróć poprzednią wersję' }));
  expect(onRestore).toHaveBeenCalledWith(revision, 'old');
});

it('does not offer to restore an expired old side', () => {
  const revision = { id: 'first-update', preference_id: 'existing', key: 'core_memory:focus', operation: 'update' as const,
    old_value: '{"text":"Wygasła deklaracja","expires_at":"2000-01-01T00:00:00Z"}', new_value: 'Po zmianie',
    old_is_active: true, new_is_active: true, changed_at: '2026-10-18T10:00:00Z' };
  render(<CoreMemoryHistoryView expanded onExpand={vi.fn()} current={[{ id: 'existing', key: revision.key, value: revision.new_value, is_active: true, updated_at: '2026-10-19T10:00:00Z' }]}
    revisions={[revision]} loading={false} error={null} hasMore={false} onLoadMore={vi.fn()} onRefresh={vi.fn()}
    restoring={false} restored={false} onRestore={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /Przywróć/ })).not.toBeInTheDocument();
});
