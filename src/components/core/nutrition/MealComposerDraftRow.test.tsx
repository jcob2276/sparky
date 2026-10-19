import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MealComposerDraftRow from './MealComposerDraftRow';
import type { MealDraftItem } from '../../../lib/health/nutritionTracker';

const testItem: MealDraftItem = {
  id: 'item-1',
  name: 'Jabłko',
  grams: 180,
  calories: 95,
  protein: 0.5,
  carbs: 25,
  fat: 0.3,
  confidence: 'high',
  source: 'database',
  parseMeta: {
    parserVersion: 'composer-v1',
    macroSource: 'llm_estimate',
    unit: 'szt',
    defaultGrams: 180,
    baseGrams: 180,
    baseCalories: 95,
  },
};

describe('MealComposerDraftRow', () => {
  it('allows clearing the quantity input completely to empty/0 without locking', () => {
    const onChange = vi.fn();
    render(
      <MealComposerDraftRow
        item={testItem}
        remember={false}
        onRememberChange={vi.fn()}
        onChange={onChange}
        onRemove={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox', { name: /Ilość: Jabłko/i }) as HTMLInputElement;
    expect(input.value).toBe('1');

    // Simulate user clearing input with backspace
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenCalled();
    const lastCalledWith = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCalledWith.grams).toBe(0);

    // Now type a new number directly
    fireEvent.change(input, { target: { value: '3' } });
    expect(input.value).toBe('3');
  });

  it('provides quick clear (x) button to zero out input', () => {
    const onChange = vi.fn();
    render(
      <MealComposerDraftRow
        item={testItem}
        remember={false}
        onRememberChange={vi.fn()}
        onChange={onChange}
        onRemove={vi.fn()}
      />
    );

    const clearBtn = screen.getByRole('button', { name: 'Wyczyść ilość' });
    fireEvent.click(clearBtn);

    const input = screen.getByRole('textbox', { name: /Ilość: Jabłko/i }) as HTMLInputElement;
    expect(input.value).toBe('');
    const lastCalledWith = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCalledWith.grams).toBe(0);
  });

  it('increments and decrements using stepper buttons', () => {
    const onChange = vi.fn();
    render(
      <MealComposerDraftRow
        item={testItem}
        remember={false}
        onRememberChange={vi.fn()}
        onChange={onChange}
        onRemove={vi.fn()}
      />
    );

    const plusBtn = screen.getByRole('button', { name: 'Zwiększ ilość' });
    fireEvent.click(plusBtn);

    const input = screen.getByRole('textbox', { name: /Ilość: Jabłko/i }) as HTMLInputElement;
    expect(input.value).toBe('2');

    const minusBtn = screen.getByRole('button', { name: 'Zmniejsz ilość' });
    fireEvent.click(minusBtn);
    expect(input.value).toBe('1');
  });

  it('switches units between g and piece', () => {
    const onChange = vi.fn();
    render(
      <MealComposerDraftRow
        item={testItem}
        remember={false}
        onRememberChange={vi.fn()}
        onChange={onChange}
        onRemove={vi.fn()}
      />
    );

    const gramsBtn = screen.getByRole('button', { name: /^g$/i });
    fireEvent.click(gramsBtn);

    expect(onChange).toHaveBeenCalled();
    const lastCalledWith = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCalledWith.parseMeta?.unit).toBe('g');
  });
});

describe('MealComposerDraftRow unit picker', () => {
  it('shows named units and the current choice, then applies the chosen unit', () => {
    const onChange = vi.fn();
    render(<MealComposerDraftRow item={testItem} remember={false} onRememberChange={vi.fn()} onChange={onChange} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Inna jednostka' }));
    const picker = within(screen.getByRole('dialog', { name: 'Jednostka porcji' }));
    expect(picker.getByRole('button', { name: /Sztuka/ })).toHaveAttribute('aria-pressed', 'true');
    expect(picker.getByRole('button', { name: /Opakowanie/ })).toBeInTheDocument();
    fireEvent.click(picker.getByRole('button', { name: /łyżka/i }));
    expect(onChange.mock.calls.at(-1)?.[0].parseMeta?.unit).toBe('tbsp');
  });

  it('closes with Escape and returns focus without changing the portion', async () => {
    const onChange = vi.fn();
    render(<MealComposerDraftRow item={testItem} remember={false} onRememberChange={vi.fn()} onChange={onChange} onRemove={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Inna jednostka' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Jednostka porcji' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
});
