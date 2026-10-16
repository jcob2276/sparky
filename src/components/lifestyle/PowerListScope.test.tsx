import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PowerList from './PowerList';
import { ControlInput } from '../ui/ControlPrimitives';

const source = vi.hoisted(() => ({ user: 'first', day: '2026-10-16', rollover: () => {} }));
vi.mock('../../store/useStore', () => ({ useUserId: () => source.user }));
vi.mock('../../lib/date', () => ({ getTodayWarsaw: () => source.day }));
vi.mock('../../hooks/useWarsawDayChange', () => ({ useWarsawDayChange: (callback: () => void) => { source.rollover = callback; } }));
vi.mock('./usePowerListData', () => ({ usePowerListData: () => {
  const [draft, setDraft] = useState('');
  return { pickerSlot: -1, pickerRef: { current: null }, newTaskForm: draft, updateSlot: setDraft };
} }));
vi.mock('./powerList/PowerListSetup', () => ({ default: ({ newTaskForm, updateSlot }: { newTaskForm: string; updateSlot: (value: string) => void }) =>
  <ControlInput aria-label="Szkic" value={newTaskForm} onChange={(event) => updateSlot(event.target.value)} /> }));
vi.mock('./powerList/PowerListActive', () => ({ default: () => <div>Zapisany plan</div> }));
beforeEach(() => { source.user = 'first'; source.day = '2026-10-16'; });
afterEach(cleanup);

it('does not carry an in-memory draft into another account', () => {
  const { rerender } = render(<PowerList todayWin={null} />);
  fireEvent.change(screen.getByLabelText('Szkic'), { target: { value: 'Prywatny szkic' } });
  source.user = 'second'; rerender(<PowerList todayWin={null} />);
  expect(screen.getByLabelText('Szkic')).toHaveValue('');
});

it('starts a fresh day scope after Warsaw midnight', () => {
  render(<PowerList todayWin={null} />);
  fireEvent.change(screen.getByLabelText('Szkic'), { target: { value: 'Wczorajszy szkic' } });
  source.day = '2026-10-17'; act(() => source.rollover());
  expect(screen.getByLabelText('Szkic')).toHaveValue('');
});

it('also resets on a render after midnight before the polling callback runs', () => {
  const { rerender } = render(<PowerList todayWin={null} />);
  fireEvent.change(screen.getByLabelText('Szkic'), { target: { value: 'Wczorajszy szkic' } });
  source.day = '2026-10-17'; rerender(<PowerList todayWin={null} />);
  expect(screen.getByLabelText('Szkic')).toHaveValue('');
});
