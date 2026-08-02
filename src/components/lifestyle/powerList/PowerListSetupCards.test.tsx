// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PowerListSetup from './PowerListSetup';
import { YesterdayRecap } from './PowerListSetupCards';
import { EMPTY_SLOT } from '../usePowerListTypes';

function yesterdayWin(done: boolean) {
  return {
    id: 'win-yesterday',
    date: '2026-07-31',
    daily_win_tasks: [
      { id: 'task-1', slot: 1, title: 'Sauna', done, completed_at: null },
    ],
  };
}

function renderRecap(done = false, onToggleYesterdayTask = vi.fn()) {
  render(
    <YesterdayRecap
      yesterdayWin={yesterdayWin(done)}
      yesterdayNote=""
      setYesterdayNote={() => {}}
      yesterdayNoteRequired
      dayScore={7}
      setDayScore={() => {}}
      moodScore={3}
      setMoodScore={() => {}}
      onToggleYesterdayTask={onToggleYesterdayTask}
      savingYesterdayTaskIds={new Set()}
    />,
  );
  return onToggleYesterdayTask;
}

describe('YesterdayRecap', () => {
  it('lets the user mark a yesterday task as completed from the reflection', () => {
    const onToggle = renderRecap();

    expect(screen.getByRole('list', { name: 'Zadania z wczoraj' })).toHaveAttribute(
      'data-ui',
      'grouped-list',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako wykonane: Sauna' }));

    expect(onToggle).toHaveBeenCalledWith('task-1');
  });

  it('lets the user undo a mistaken completion', () => {
    const onToggle = renderRecap(true);

    fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako niewykonane: Sauna' }));

    expect(onToggle).toHaveBeenCalledWith('task-1');
  });
});

describe('PowerListSetup', () => {
  it('keeps planning focused on choosing five wins without the AI questions panel', () => {
    const direction: ComponentProps<typeof PowerListSetup>['direction'] = {
      weekStart: '2026-07-27',
      weekGoals: undefined,
      weekGoalsMeta: undefined,
      mustPins: undefined,
      openMustPins: undefined,
      parentSkills: [],
      parentSkillsRaw: [],
      urgentTodos: undefined,
      activeProjects: undefined,
      powerListStats: undefined,
      sprintGoal: undefined,
      sprintLabel: undefined,
      sprintFocusProjectIds: [],
      monthTheme: undefined,
      monthLabel: undefined,
      bhagLine: undefined,
      focus: undefined,
      weekCheckpointsDone: undefined,
      weekCheckpointsDue: undefined,
      skills: undefined,
      checkpoints: { all: [], overdue: [], upcoming: [] },
      loading: false,
      reload: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <PowerListSetup
        yesterdayWin={null}
        yesterdayNote=""
        setYesterdayNote={vi.fn()}
        yesterdayDayScore={7}
        setYesterdayDayScore={vi.fn()}
        yesterdayMoodScore={3}
        setYesterdayMoodScore={vi.fn()}
        yesterdayNoteRequired={false}
        toggleYesterdayTask={vi.fn()}
        savingYesterdayTaskIds={new Set()}
        direction={direction}
        fillSlotFromCheckpoint={vi.fn()}
        occupiedSlots={[false, false, false, false, false]}
        newTaskForm={Array.from({ length: 5 }, () => ({ ...EMPTY_SLOT }))}
        updateSlot={vi.fn()}
        todoItems={[]}
        pickerSlot={-1}
        setPickerSlot={vi.fn()}
        pickerRef={createRef<HTMLDivElement>()}
        startNewDay={vi.fn()}
        submitting={false}
      />,
    );

    expect(screen.getByText('Pięć dzisiejszych zwycięstw')).toBeInTheDocument();
    expect(screen.getByText('Najbliższy ruch').closest('[data-variant="hero"]')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Plan dnia' })).toHaveAttribute(
      'data-ui',
      'grouped-list',
    );
    expect(screen.queryByText('Pytania pomocnicze')).not.toBeInTheDocument();
  });
});
