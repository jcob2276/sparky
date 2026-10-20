import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LibraryAddModal from './LibraryAddModal';

const m = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('./useLibrary', () => ({ useAddLibraryItems: () => ({ mutateAsync: m.mutateAsync, isPending: false }) }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));

const renderModal = () => {
  const onClose = vi.fn();
  render(<LibraryAddModal userId="u1" today="2026-10-21" onClose={onClose} />);
  return { onClose };
};

beforeEach(() => {
  vi.clearAllMocks();
  m.mutateAsync.mockResolvedValue({ added: 1, skipped: 0 });
});

describe('LibraryAddModal', () => {
  it('bez tytułu nie zapisuje i pokazuje powód', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj na półkę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wpisz tytuł.');
    expect(m.mutateAsync).not.toHaveBeenCalled();
  });

  it('sam tytuł wystarcza i zamyka okno po zapisie', async () => {
    const { onClose } = renderModal();
    fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Dune' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj na półkę' }));
    await waitFor(() => expect(m.mutateAsync).toHaveBeenCalledTimes(1));
    expect(m.mutateAsync.mock.calls[0][0]).toEqual([expect.objectContaining({ title: 'Dune', resourceType: 'book', finishedOn: null, finishedYear: null, source: 'manual' })]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('sam rok idzie jako rok, a wybór daty blokuje pole roku', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Heat' } });
    fireEvent.change(screen.getByLabelText('Albo sam rok'), { target: { value: '2018x' } });
    expect(screen.getByLabelText('Albo sam rok')).toHaveValue('2018');
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj na półkę' }));
    await waitFor(() => expect(m.mutateAsync).toHaveBeenCalled());
    expect(m.mutateAsync.mock.calls[0][0][0]).toMatchObject({ finishedYear: 2018, finishedOn: null });
  });

  it('pole stron tylko dla książek i kursów', () => {
    renderModal();
    expect(screen.getByLabelText(/Liczba stron/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Rodzaj'), { target: { value: 'video' } });
    expect(screen.queryByLabelText(/Liczba stron/)).not.toBeInTheDocument();
  });

  it('duplikat (0 dodanych) nie zamyka okna i mówi dlaczego', async () => {
    m.mutateAsync.mockResolvedValue({ added: 0, skipped: 1 });
    const { onClose } = renderModal();
    fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Dune' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj na półkę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Taka pozycja już jest w bibliotece.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('błąd zapisu zostawia okno otwarte', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m.mutateAsync.mockRejectedValue(new Error('db'));
    const { onClose } = renderModal();
    fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Dune' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj na półkę' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać');
    expect(onClose).not.toHaveBeenCalled();
  });
});
