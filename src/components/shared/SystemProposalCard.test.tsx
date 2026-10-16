import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { notify } from '../../lib/notify';
import { SystemProposalCard } from './SystemProposalCard';

vi.mock('../../lib/notify', () => ({ notify: vi.fn() }));

it('reports a failed decision save and keeps the proposal available for retry', async () => {
  render(<SystemProposalCard proposal={{
    id: 'one', title: 'Powtarzający się problem', body: 'Opis', payload: {}, status: 'pending', proposal_type: 'friction_cluster', created_at: '2026-10-16',
  }} onResolved={vi.fn().mockRejectedValue(new Error('offline'))} />);
  fireEvent.click(screen.getByRole('button', { name: 'Istotne' }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('Nie udało się zapisać decyzji'), 'error'));
  expect(screen.getByText('Powtarzający się problem')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Istotne' })).toBeEnabled();
});
