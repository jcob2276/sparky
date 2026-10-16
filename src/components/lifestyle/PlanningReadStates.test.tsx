import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DirectionPlanningMode from './DirectionPlanningMode';
import PowerList from './PowerList';

const source = vi.hoisted(() => ({ updateSlot: vi.fn(), active: false, direction: { hasData: true, loading: false, isError: false, error: null as Error | null, checkpoints: { overdue: [], upcoming: [] } } }));
vi.mock('../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('./direction/hooks/useDirectionContext', () => ({ useDirectionContext: () => source.direction }));
vi.mock('./usePowerListData', () => ({ usePowerListData: () => ({
  direction: source.direction, pickerSlot: -1, pickerRef: { current: null },
  newTaskForm: Array.from({ length: 5 }, (_, index) => ({ task: `Zadanie ${index + 1}`, todoId: null })),
  todoItems: [], updateSlot: source.updateSlot, occupiedSlots: [true, true, true, true, true],
  todayWin: source.active ? { id: 'today', daily_win_tasks: [] } : null,
}) }));
vi.mock('../shared/PlanningCheckpointsStrip', () => ({ default: () => null }));
vi.mock('./voicePlanning/VoicePlanModal', () => ({ default: () => null }));
vi.mock('./powerList/PowerListSetupCards', () => ({ YesterdayRecap: () => <div data-testid="yesterday-reflection" /> }));
vi.mock('./powerList/PowerListActive', () => ({ default: () => <div data-testid="existing-tasks" /> }));
vi.mock('../shared/WeekLoopSummary', () => ({ default: () => null }));
vi.mock('./ProjectWeekKpis', () => ({ default: () => null }));
vi.mock('./directionPlan/DirectionPlanBlocks', () => ({ Block1Narrative: () => null }));
vi.mock('./directionPlan/DirectionPlanReflection', () => ({ default: () => <div data-testid="reflection-editor" /> }));
vi.mock('./directionPlan/DirectionPlanDeepening', () => ({ default: () => null }));
vi.mock('./directionPlan/DirectionPlanWeekPlan', () => ({ default: () => <div data-testid="week-plan-editor" /> }));
beforeEach(() => { vi.clearAllMocks(); source.active = false; source.direction = { hasData: true, loading: false, isError: false, error: null, checkpoints: { overdue: [], upcoming: [] } }; });
afterEach(cleanup);
const weekProps = { reflectionSaved: true, deepeningAnswers: {}, phase2Loading: false, weekStart: '2026-10-12', planWeekStart: '2026-10-19' } as Parameters<typeof DirectionPlanningMode>[0];

describe('planning depends on a successful context read', () => {
  it.each(['loading', 'error'])('keeps a draft editable but blocks day submission before context is available (%s)', (state) => {
    source.direction.hasData = false;
    source.direction.loading = state === 'loading'; source.direction.isError = state === 'error';
    source.direction.error = state === 'error' ? new Error('goal_kpis offline') : null;
    render(<PowerList todayWin={null} />);
    expect(screen.queryByRole('button', { name: 'Zacznij dzień' })).not.toBeInTheDocument();
    expect(screen.getByText(state === 'loading' ? 'Wczytuję kontekst planowania' : 'Kontekst planowania niedostępny')).toBeInTheDocument();
    expect(screen.getByTestId('yesterday-reflection')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Zwycięstwo 1' }), { target: { value: 'Własne zadanie' } });
    expect(source.updateSlot).toHaveBeenCalledWith(0, { task: 'Własne zadanie' });
  });
  it.each(['loading', 'error'])('keeps weekly planning closed while context is %s but allows reflection', (state) => {
    source.direction.hasData = false;
    source.direction.loading = state === 'loading'; source.direction.isError = state === 'error';
    source.direction.error = state === 'error' ? new Error('goal_kpis offline') : null;
    render(<DirectionPlanningMode {...weekProps} />);
    expect(screen.queryByTestId('week-plan-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('reflection-editor')).toBeInTheDocument();
  });
  it('keeps existing daily tasks usable when the direction read fails', () => {
    source.active = true; source.direction.isError = true; source.direction.error = new Error('offline');
    render(<PowerList todayWin={null} />);
    expect(screen.getByTestId('existing-tasks')).toBeInTheDocument();
  });
  it('opens the editors after a successful read', () => {
    const { unmount } = render(<PowerList todayWin={null} />);
    expect(screen.getByRole('button', { name: 'Zacznij dzień' })).toBeEnabled(); unmount();
    render(<DirectionPlanningMode {...weekProps} />);
    expect(screen.getByTestId('week-plan-editor')).toBeInTheDocument();
  });
  it('preserves planning from a known context when only its background refresh failed', () => {
    source.direction.isError = true; source.direction.error = new Error('refresh offline');
    const { unmount } = render(<PowerList todayWin={null} />);
    expect(screen.getByRole('button', { name: 'Zacznij dzień' })).toBeEnabled();
    expect(screen.getByText('Nie udało się odświeżyć kontekstu planowania')).toBeInTheDocument(); unmount();
    render(<DirectionPlanningMode {...weekProps} />);
    expect(screen.getByTestId('week-plan-editor')).toBeInTheDocument();
  });
});
