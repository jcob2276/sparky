import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExerciseNameInput from './ExerciseNameInput';

vi.mock('../../../data/openGymCatalog', () => ({
  preloadOpenGymCatalog: vi.fn(),
  searchOpenGymCatalog: vi.fn(async () => [{ name: 'barbell bench press with a very long exercise name', target: 'pectorals', secondaries: [], equipment: 'barbell' }]),
  mapTargetToSparkyTags: () => ['klatka', 'triceps', 'barki'],
}));

afterEach(cleanup);

describe('ExerciseNameInput', () => {
  it('keeps the search field available while its parent receives each typed character', () => {
    function Harness() {
      const [name, setName] = useState('');
      return <ExerciseNameInput value={name} tags={[]} onChange={setName} />;
    }
    render(<Harness />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'b' } });
    expect(screen.getByRole('textbox')).toHaveValue('b');
    fireEvent.change(input, { target: { value: 'bench' } });
    expect(screen.getByRole('textbox')).toHaveValue('bench');
  });
  it('allows selecting a full exercise name with a click or keyboard activation', async () => {
    const onChange = vi.fn();
    render(<ExerciseNameInput value="" tags={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bench' } });
    const name = 'Barbell bench press with a very long exercise name';
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
    expect(onChange).toHaveBeenLastCalledWith(name, ['klatka', 'triceps', 'barki']);
  });

  it('lets Escape dismiss results while keeping the exercise name', async () => {
    render(<ExerciseNameInput value="" tags={[]} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bench' } });
    await screen.findByRole('button', { name: /Barbell bench press/ });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /Barbell bench press/ })).not.toBeInTheDocument();
    expect(input).toHaveValue('bench');
  });
});
