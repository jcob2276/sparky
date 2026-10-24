import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LifeTargetsSettings from './LifeTargetsSettings';

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), notify: vi.fn() }));

vi.mock('../../lib/lifeTargetsApi', () => ({
  useLifeTargets: () => ({ bodyFatPct: 14, benchKg: 100, incomeNetPln: 15000 }),
  useSaveLifeTargets: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));
vi.mock('../../lib/notify', () => ({ notify: mocks.notify }));

describe('LifeTargetsSettings', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('pokazuje aktualne cele i blokuje zapis bez zmiany', () => {
    render(<LifeTargetsSettings userId="u1" />);
    expect(screen.getByDisplayValue('100')).toBeTruthy();
    expect(screen.getByDisplayValue('15000')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Zapisz cele' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('zapisuje zmienione cele jako liczby', async () => {
    render(<LifeTargetsSettings userId="u1" />);
    fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '110' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz cele' }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ benchKg: 110, incomeNetPln: 15000 }));
    expect(mocks.notify).toHaveBeenCalledWith('Zapisano cele.', 'success');
  });

  it('nie pozwala zapisać pustej ani zerowej wartości', () => {
    render(<LifeTargetsSettings userId="u1" />);
    fireEvent.change(screen.getByDisplayValue('15000'), { target: { value: '0' } });
    expect((screen.getByRole('button', { name: 'Zapisz cele' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
