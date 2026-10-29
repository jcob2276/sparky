import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AboutMeSettings from './AboutMeSettings';

const api = vi.hoisted(() => ({
  fetchUserFundament: vi.fn(),
  upsertUserFundament: vi.fn(),
  ingestVaultCategory: vi.fn(),
}));

vi.mock('../../lib/identityVaultApi', () => api);
vi.mock('../../lib/notify', () => ({ notify: vi.fn() }));

function renderBlock() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AboutMeSettings userId="u1" />
    </QueryClientProvider>,
  );
}

describe('AboutMeSettings', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the saved fields and hides the save button until something changes', async () => {
    api.fetchUserFundament.mockResolvedValue({ identity: 'Jestem X', philosophy: '', vision: 'Cel Y' });
    renderBlock();

    expect(await screen.findByDisplayValue('Jestem X')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cel Y')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Zapisz profil/ })).not.toBeInTheDocument();
  });

  it('saves and ingests only the fields that changed', async () => {
    api.fetchUserFundament.mockResolvedValue({ identity: 'Jestem X', philosophy: '', vision: 'Cel Y' });
    api.ingestVaultCategory.mockResolvedValue({ chunks: 1 });
    api.upsertUserFundament.mockResolvedValue(undefined);
    renderBlock();

    fireEvent.change(await screen.findByLabelText('Ja'), { target: { value: 'Jestem Z' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz profil/ }));

    await waitFor(() => expect(api.upsertUserFundament).toHaveBeenCalledWith('u1', { identity: 'Jestem Z' }));
    expect(api.ingestVaultCategory).toHaveBeenCalledTimes(1);
    expect(api.ingestVaultCategory).toHaveBeenCalledWith('u1', 'identity', 'Jestem Z');
  });
});
