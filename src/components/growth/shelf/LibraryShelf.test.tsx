import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '../../../lib/learning/shelfModel';
import LibraryShelf from './LibraryShelf';
import { makeItem } from './shelfTestUtils';

const m = vi.hoisted(() => ({
  library: {} as { data?: LibraryItem[]; isLoading: boolean; error: Error | null },
  mutateAsync: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('./useLibrary', () => ({
  useLibraryItems: () => m.library,
  useDeleteLibraryItem: () => ({ mutateAsync: m.mutateAsync, isPending: false }),
}));
vi.mock('./LibraryImportModal', () => ({ default: () => <div data-testid="import-modal" /> }));
vi.mock('./LibraryAddModal', () => ({ default: () => <div data-testid="add-modal" /> }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn(), confirmDialog: (...args: unknown[]) => m.confirm(...args) }));

const TODAY = '2026-10-21';
const library = (data: LibraryItem[], extra: Partial<typeof m.library> = {}) => {
  m.library = { data, isLoading: false, error: null, ...extra };
};
const items = () => [
  makeItem({ id: 'b1', title: 'Dune', resource_type: 'book', finished_on: '2019-05-01' }),
  makeItem({ id: 'b2', title: 'Solaris', resource_type: 'book', finished_on: '2026-02-01' }),
  makeItem({ id: 'v1', title: 'Joker', resource_type: 'video', pages: null, finished_on: '2026-03-01' }),
];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  m.mutateAsync.mockResolvedValue(undefined);
  m.confirm.mockResolvedValue(true);
  library(items());
});
afterEach(() => vi.useRealTimers());

describe('LibraryShelf', () => {
  it('pusta biblioteka zachęca do importu i otwiera okno importu', () => {
    library([]);
    render(<LibraryShelf userId="u1" today={TODAY} />);
    expect(screen.getByText('Twoja biblioteka jest pusta.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Importuj listę' }));
    expect(screen.getByTestId('import-modal')).toBeInTheDocument();
  });

  it('przycisk Dodaj otwiera okno dodawania', () => {
    render(<LibraryShelf userId="u1" today={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /Dodaj/ }));
    expect(screen.getByTestId('add-modal')).toBeInTheDocument();
  });

  it('pokazuje statystyki (w tym roku i razem) oraz grzbiety z opisem dla czytników ekranu', () => {
    render(<LibraryShelf userId="u1" today={TODAY} />);
    const tile = (label: string) => screen.getAllByText(label).find((el) => el.tagName === 'P')!.closest('div');
    expect(tile('Książki')).toHaveTextContent('2 · w tym roku 1');
    expect(tile('Filmy')).toHaveTextContent('1 · w tym roku 1');
    expect(screen.getByRole('button', { name: 'Dune, Książka, skończone 1.05.2019' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Joker, Film \/ wideo/ })).toBeInTheDocument();
  });

  it('filtr Filmy zostawia tylko filmy', () => {
    render(<LibraryShelf userId="u1" today={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filmy' }));
    expect(screen.getByRole('button', { name: /Joker/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dune/ })).not.toBeInTheDocument();
  });

  it('kliknięcie grzbietu pokazuje kartę, ponowne ją zwija', () => {
    render(<LibraryShelf userId="u1" today={TODAY} />);
    const spine = screen.getByRole('button', { name: /Dune/ });
    fireEvent.click(spine);
    expect(spine).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Szczegóły: Dune' })).toHaveTextContent('Frank Herbert');
    fireEvent.click(spine);
    expect(screen.queryByRole('region', { name: 'Szczegóły: Dune' })).not.toBeInTheDocument();
  });

  it('usuwanie pyta o potwierdzenie i usuwa wybraną pozycję', async () => {
    render(<LibraryShelf userId="u1" today={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /Dune/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Usuń z biblioteki: Dune' }));
    await waitFor(() => expect(m.mutateAsync).toHaveBeenCalledWith('b1'));
    expect(m.confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Szczegóły: Dune' })).not.toBeInTheDocument());
  });

  it('odmowa w potwierdzeniu niczego nie usuwa', async () => {
    m.confirm.mockResolvedValue(false);
    render(<LibraryShelf userId="u1" today={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /Dune/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Usuń z biblioteki: Dune' }));
    await waitFor(() => expect(m.confirm).toHaveBeenCalled());
    expect(m.mutateAsync).not.toHaveBeenCalled();
  });

  it('błąd odczytu pokazuje komunikat', () => {
    library([], { error: new Error('offline') });
    render(<LibraryShelf userId="u1" today={TODAY} />);
    expect(screen.getByText('Nie udało się wczytać biblioteki')).toBeInTheDocument();
  });
});

describe('LibraryShelf: animacja nowych pozycji', () => {
  it('animuje tylko świeżo dodane i po chwili zapamiętuje je jako obejrzane', () => {
    vi.useFakeTimers();
    const now = new Date();
    library([
      makeItem({ id: 'old', title: 'Stara', created_at: '2019-06-01T10:00:00Z' }),
      makeItem({ id: 'new', title: 'Nowa', created_at: new Date(now.getTime() - 60_000).toISOString() }),
    ]);
    render(<LibraryShelf userId="u1" today={TODAY} />);
    expect(screen.getByRole('button', { name: /Nowa/ })).toHaveClass('shelf-spine--new');
    expect(screen.getByRole('button', { name: /Stara/ })).not.toHaveClass('shelf-spine--new');
    act(() => { vi.advanceTimersByTime(2400); });
    expect(JSON.parse(localStorage.getItem('sparky_shelf_seen_u1') ?? '[]')).toEqual(['new']);
    expect(screen.getByRole('button', { name: /Nowa/ })).not.toHaveClass('shelf-spine--new');
  });

  it('już obejrzana pozycja nie animuje się ponownie', () => {
    localStorage.setItem('sparky_shelf_seen_u1', JSON.stringify(['new']));
    library([makeItem({ id: 'new', title: 'Nowa', created_at: new Date(Date.now() - 60_000).toISOString() })]);
    render(<LibraryShelf userId="u1" today={TODAY} />);
    expect(screen.getByRole('button', { name: /Nowa/ })).not.toHaveClass('shelf-spine--new');
  });
});
