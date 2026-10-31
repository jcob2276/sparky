import { fireEvent, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDashboardKeyboardShortcuts } from './useDashboardKeyboardShortcuts';

afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.useRealTimers(); });

function setup(pathname = '/dzis') {
  const food = vi.fn();
  const setters = {
    setShowMorningPlan: vi.fn(), setShowShutdown: vi.fn(), setShowWeeklyReview: vi.fn(),
    setShowQuickFoodEntry: food, setActionCenterOpen: vi.fn(), setShowSearch: vi.fn(),
    setShowFastCapture: vi.fn(), setFoodEditEntry: vi.fn(),
  };
  const navigate = vi.fn();
  renderHook(() => useDashboardKeyboardShortcuts({ openModal: null, navigate, pathname, setters }));
  return { food, navigate };
}

it('opens the existing food modal when the food card is hidden', () => {
  const { food } = setup();
  fireEvent.keyDown(window, { key: 'f' });
  expect(food).toHaveBeenCalledWith(true);
});

it('preserves the scroll shortcut for a visible food card', () => {
  const composer = document.createElement('section');
  composer.id = 'meal-composer';
  composer.scrollIntoView = vi.fn();
  document.body.append(composer);
  const { food } = setup();
  fireEvent.keyDown(window, { key: 'f' });
  expect(composer.scrollIntoView).toHaveBeenCalledOnce();
  expect(food).not.toHaveBeenCalled();
});

it('does not open a second action behind the layout editor', () => {
  const dialog = document.createElement('section');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
  document.body.append(dialog);
  const { food } = setup();
  fireEvent.keyDown(window, { key: 'f' });
  expect(food).not.toHaveBeenCalled();
});

it('still opens food after navigating from another tab if the card stays hidden', () => {
  vi.useFakeTimers();
  const { food, navigate } = setup('/tydzien');
  fireEvent.keyDown(window, { key: 'f' });
  expect(navigate).toHaveBeenCalledWith('/dzis');
  vi.runAllTimers();
  expect(food).toHaveBeenCalledWith(true);
});
