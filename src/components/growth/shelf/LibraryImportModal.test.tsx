import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewLibraryItem } from '../../../lib/learning/libraryImport';
import LibraryImportModal from './LibraryImportModal';
import { makeItem } from './shelfTestUtils';

const m = vi.hoisted(() => ({ mutateAsync: vi.fn(), notify: vi.fn() }));

vi.mock('./useLibrary', () => ({ useAddLibraryItems: () => ({ mutateAsync: m.mutateAsync, isPending: false }) }));
vi.mock('../../../lib/notify', () => ({ notify: (...args: unknown[]) => m.notify(...args) }));

const renderModal = (existing = [makeItem({ title: 'Solaris', author: null })]) => {
  const onClose = vi.fn();
  render(<LibraryImportModal userId="u1" today="2026-10-21" existing={existing} onClose={onClose} />);
  return { onClose };
};
const paste = (value: string) => fireEvent.change(screen.getByLabelText(/Jedna pozycja w linii/), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  m.mutateAsync.mockResolvedValue({ added: 3, skipped: 0 });
});

describe('LibraryImportModal: wklejona lista', () => {
  it('bez tekstu nie ma czego dodać', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Nic do dodania' })).toBeDisabled();
  });

  it('pokazuje podgląd z liczbą nowych i duplikatów, a zapis wysyła tylko nowe z rodzajami z nagłówków', async () => {
    const { onClose } = renderModal();
    paste('Książki:\nDune — Frank Herbert\nSolaris\nFilmy 2019:\nJoker');
    expect(screen.getByText(/Do dodania: 2/)).toBeInTheDocument();
    expect(screen.getByText(/już są: 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj 2 na półkę' }));
    await waitFor(() => expect(m.mutateAsync).toHaveBeenCalledTimes(1));
    const sent = m.mutateAsync.mock.calls[0][0] as NewLibraryItem[];
    expect(sent.map((r) => [r.title, r.resourceType, r.finishedYear])).toEqual([
      ['Dune', 'book', null],
      ['Joker', 'video', 2019],
    ]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(m.notify).toHaveBeenCalledWith(expect.stringContaining('Dodano na półkę: 3'), 'success');
  });

  it('domyślny rodzaj „Filmy” dotyczy linii bez nagłówka', async () => {
    renderModal([]);
    fireEvent.click(screen.getByRole('button', { name: 'Filmy' }));
    paste('Joker\nMatrix');
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj 2 na półkę' }));
    await waitFor(() => expect(m.mutateAsync).toHaveBeenCalled());
    expect((m.mutateAsync.mock.calls[0][0] as NewLibraryItem[]).every((r) => r.resourceType === 'video')).toBe(true);
  });

  it('błąd zapisu zostawia okno otwarte z komunikatem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m.mutateAsync.mockRejectedValue(new Error('db'));
    const { onClose } = renderModal([]);
    paste('Dune');
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj 1 na półkę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać importu');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('LibraryImportModal: plik CSV', () => {
  const csvFile = (content: string, name = 'goodreads.csv') => new File([content], name, { type: 'text/csv' });
  const upload = async (file: File) => {
    fireEvent.click(screen.getByRole('button', { name: 'Plik CSV' }));
    fireEvent.change(screen.getByLabelText(/Eksport z Goodreads/), { target: { files: [file] } });
  };

  it('rozpoznaje Goodreads i pokazuje tylko półkę „read”', async () => {
    renderModal([]);
    await upload(csvFile([
      'Title,Author,My Rating,Number of Pages,Date Read,Exclusive Shelf',
      'Dune,Frank Herbert,5,612,2019/05/01,read',
      'Ubik,Philip K. Dick,4,224,,to-read',
    ].join('\n')));
    expect(await screen.findByText(/rozpoznano Goodreads/)).toBeInTheDocument();
    expect(screen.getByText(/Do dodania: 1/)).toBeInTheDocument();
  });

  it('plik bez kolumny z tytułem pokazuje błąd i nie pozwala dodać', async () => {
    renderModal([]);
    await upload(csvFile('a,b\n1,2', 'zly.csv'));
    expect(await screen.findByText('Nie znalazłem kolumny z tytułem. Sprawdź plik.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nic do dodania' })).toBeDisabled();
  });

  it('odrzuca zbyt duży plik', async () => {
    renderModal([]);
    const big = csvFile('x');
    Object.defineProperty(big, 'size', { value: 3_000_000 });
    await upload(big);
    expect(await screen.findByText('Plik jest za duży (max 2 MB).')).toBeInTheDocument();
  });
});
