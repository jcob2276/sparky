import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BodyMeasureBanner from './BodyMeasureBanner';

const state = vi.hoisted(() => ({ reminders: [] as Array<{ kind: 'weight' | 'tape'; state: 'ok' | 'due' | 'overdue'; lastDate: string | null; ageDays: number | null; everyDays: number }> }));

vi.mock('../../../lib/health/bodyRemindersApi', () => ({
  useBodyReminders: () => ({ reminders: state.reminders, rows: [], loading: false }),
  useSaveBodyEntry: () => vi.fn(),
}));

describe('BodyMeasureBanner', () => {
  it('nic nie pokazuje, gdy pomiary są w terminie', () => {
    state.reminders = [{ kind: 'weight', state: 'ok', lastDate: '2026-10-23', ageDays: 1, everyDays: 3 }];
    const { container } = render(<BodyMeasureBanner userId="u1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('w dniu terminu pokazuje spokojne przypomnienie, po terminie oznaczenie zaległości', () => {
    state.reminders = [
      { kind: 'weight', state: 'due', lastDate: '2026-10-21', ageDays: 3, everyDays: 3 },
      { kind: 'tape', state: 'overdue', lastDate: '2026-09-01', ageDays: 53, everyDays: 21 },
    ];
    render(<BodyMeasureBanner userId="u1" />);
    expect(screen.getByText('Waga i talia')).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Obwody ciała');
    expect(alert.textContent).toContain('Po terminie');
    expect(alert.textContent).toContain('53 dni temu');
    expect(screen.getByRole('button', { name: 'Wpisz pomiar: Obwody ciała' })).toBeInTheDocument();
  });
});
