import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as insight from '../desktopLenieInsight';
import LeniePanelMini from './LeniePanelMini';

afterEach(() => vi.restoreAllMocks());

describe('LeniePanelMini', () => {
  it('reuses statistics until history changes, including an empty history', () => {
    const stats = vi.spyOn(insight, 'computeLenieStats');
    const { rerender } = render(<LeniePanelMini />);
    expect(stats).toHaveBeenCalledOnce();
    rerender(<LeniePanelMini />);
    expect(stats).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Wzorce & Statystyki' }));
    expect(stats).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog')).toHaveTextContent('0%');
    const logs = [{ date: '2026-10-28', logged_at: '2026-10-28T20:00:00Z' }];
    rerender(<LeniePanelMini logs={logs} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('100%');
    expect(stats).toHaveBeenLastCalledWith(logs);
  });
});
