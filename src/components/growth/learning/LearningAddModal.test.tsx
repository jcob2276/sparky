import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedLink } from '../../../lib/linksApi';
import LearningAddModal from './LearningAddModal';

const state = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  links: [] as unknown[],
}));

vi.mock('./useLearningPlan', () => ({
  useCreateAssignment: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
  usePocketCandidates: () => ({ data: state.links, isLoading: false, error: null }),
  useTopSkills: () => ({ data: [{ id: 's1', label: 'Negocjacje i granice', sort_order: 1 }] }),
}));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));

const link = { id: 'l1', url: 'https://youtu.be/x', domain: 'youtu.be', title: 'Wykład o closingu' } as SavedLink;

const renderModal = (props: Partial<Parameters<typeof LearningAddModal>[0]> = {}) => {
  const onClose = vi.fn();
  render(<LearningAddModal userId="u1" monthStart="2026-10-01" today="2026-10-21" nextPosition={1} excludeLinkIds={[]} onClose={onClose} {...props} />);
  return { onClose };
};

beforeEach(() => {
  vi.clearAllMocks();
  state.links = [link];
  state.mutateAsync.mockResolvedValue({});
});

describe('LearningAddModal', () => {
  it('najpierw proponuje materiał własny albo nieprzeczytane z Pocketa', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Własny materiał/ })).toBeInTheDocument();
    expect(screen.getByText('Wykład o closingu')).toBeInTheDocument();
  });

  it('wybór z Pocketa wypełnia formularz tytułem i zgadniętym rodzajem (wideo)', () => {
    renderModal();
    fireEvent.click(screen.getByText('Wykład o closingu'));
    expect(screen.getByLabelText('Tytuł')).toHaveValue('Wykład o closingu');
    expect(screen.getByLabelText('Rodzaj')).toHaveValue('video');
    expect(screen.getByLabelText('Liczymy w')).toHaveValue('minutes');
  });

  it('pusty formularz nie zapisuje i pokazuje, czego brakuje', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Własny materiał/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do miesiąca' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wpisz tytuł materiału.');
    expect(state.mutateAsync).not.toHaveBeenCalled();
  });

  it('poprawny materiał własny zapisuje się z ilością, terminem końca miesiąca i pozycją', async () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Własny materiał/ }));
    fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Never Split the Difference' } });
    fireEvent.change(screen.getByLabelText(/Ile łącznie/), { target: { value: '240' } });
    fireEvent.change(screen.getByLabelText(/Umiejętność/), { target: { value: 's1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do miesiąca' }));
    await waitFor(() => expect(state.mutateAsync).toHaveBeenCalledTimes(1));
    expect(state.mutateAsync).toHaveBeenCalledWith({
      monthStart: '2026-10-01', title: 'Never Split the Difference', resourceType: 'book', unit: 'pages',
      total: 240, dueDate: '2026-10-31', linkId: null, skillId: 's1', position: 1,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('pole ilości przepuszcza tylko cyfry', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Własny materiał/ }));
    const total = screen.getByLabelText(/Ile łącznie/);
    fireEvent.change(total, { target: { value: '2a4-0' } });
    expect(total).toHaveValue('240');
  });

  it('z linku od razu pokazuje formularz bez kroku wyboru i zachowuje powiązanie z Pocketem', async () => {
    renderModal({ initialLink: link });
    expect(screen.queryByRole('button', { name: /Własny materiał/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ile łącznie/), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do miesiąca' }));
    await waitFor(() => expect(state.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ linkId: 'l1', total: 45, resourceType: 'video' })));
  });

  it('błąd zapisu zostawia okno otwarte z komunikatem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.mutateAsync.mockRejectedValue(new Error('db'));
    const { onClose } = renderModal({ initialLink: link });
    fireEvent.change(screen.getByLabelText(/Ile łącznie/), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do miesiąca' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać');
    expect(onClose).not.toHaveBeenCalled();
  });
});
