import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SphereDetailsDrawer } from './SphereDrawers';

const mockState = vi.hoisted(() => ({
  declarations: null as Record<string, string | null> | null,
}));

vi.mock('../../../lib/lifeTargetsApi', async () => {
  const { DEFAULT_LIFE_TARGETS } = await import('../../../lib/lifeGoals');
  return { useLifeTargets: () => DEFAULT_LIFE_TARGETS };
});

vi.mock('../../../store/useStore', () => ({
  useUserId: () => 'test-user',
}));

vi.mock('../../../lib/goal/goalSpine', () => ({
  fetchLongTermGoals: async () => ({ declarations: mockState.declarations, projects: [] }),
}));

function renderDrawer(pillar: 'cialo' | 'duch' | 'konto') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SphereDetailsDrawer pillar={pillar} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('SphereDetailsDrawer', () => {
  afterEach(cleanup);

  it('shows the full goal text and days left under the sphere photo', async () => {
    mockState.declarations = {
      goal_konto: 'Zostać Top Closerem: min. 100k zł zamkniętych umów',
      date_konto: '2999-01-01',
    };
    renderDrawer('konto');

    expect(await screen.findByText(/Zostać Top Closerem/)).toBeInTheDocument();
    expect(screen.getByText(/dni do celu/)).toBeInTheDocument();
    expect(screen.getByText(/Dlaczego/)).toBeInTheDocument();
  });

  it('falls back to the affirmation only when no full goal is saved', async () => {
    mockState.declarations = null;
    renderDrawer('duch');

    expect(await screen.findByText(/Dlaczego/)).toBeInTheDocument();
    expect(screen.queryByText(/dni do celu/)).not.toBeInTheDocument();
  });
});
