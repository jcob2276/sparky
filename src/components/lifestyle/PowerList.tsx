/**
 * @component PowerList
 * @role Codzienna lista 5 zadań (setup vs. tryb aktywny) — trzon zakładki DZIŚ.
 * @composes powerList/PowerListSetup, powerList/PowerListActive (obie używają powerList/TodoPicker)
 * @folders hooks/ = usePowerListActions, usePowerListEffects (wrapowane przez usePowerListData)
 * @usedBy DashboardDzisTab
 */
import { useEffect, useReducer } from 'react';
import { Target } from 'lucide-react';
import { usePowerListData } from './usePowerListData';

import PowerListSetup from './powerList/PowerListSetup';
import PowerListActive from './powerList/PowerListActive';
import PowerListProgress from './powerList/PowerListProgress';

import { type DailyWinWithTasks } from './usePowerListData';
import type { Tables } from '../../lib/database.types';
import { useUserId } from '../../store/useStore';
import { getTodayWarsaw } from '../../lib/date';
import { useWarsawDayChange } from '../../hooks/useWarsawDayChange';

export interface PowerListProps {
  todayWin: DailyWinWithTasks | null;
  onUpdate?: (data: Record<string, unknown>) => void;
  planDaySignal?: number;
}

export default function PowerList(props: PowerListProps) {
  const userId = useUserId();
  const [, refreshDay] = useReducer((tick: number) => tick + 1, 0);
  useWarsawDayChange(refreshDay);
  const today = getTodayWarsaw();
  // Remount local form/KPI state before it can be saved under another owner or day.
  const todayWin = props.todayWin?.user_id === userId && props.todayWin?.date === today ? props.todayWin : null;
  return <PowerListContent key={`${userId ?? ''}:${today}`} {...props} todayWin={todayWin} />;
}

function PowerListContent({
  todayWin,
  onUpdate,
  planDaySignal,
}: PowerListProps) {
  const {
    direction,
    projectMap,
    checkpointPrompt,
    setCheckpointPrompt,
    markingCheckpoint,
    yesterdayWin,
    yesterdayNote,
    setYesterdayNote,
    yesterdayDayScore,
    setYesterdayDayScore,
    yesterdayMoodScore,
    setYesterdayMoodScore,
    yesterdayNoteRequired,
    toggleYesterdayTask,
    savingYesterdayTaskIds,
    newTaskForm,
    todoItems,
    pickerSlot,
    setPickerSlot,
    submitting,
    pickerRef,
    occupiedSlots,
    fillSlotFromCheckpoint,
    confirmCheckpointDone,
    updateSlot,
    eveningCloseDue,
    eveningNote,
    setEveningNote,
    savingEvening,
    saveEveningClose,
    toggleTask,
    startNewDay,
    todayWin: effectiveTodayWin,
  } = usePowerListData({ todayWin, onUpdate, planDaySignal });

  // Escape key for picker slot
  useEffect(() => {
    if (pickerSlot < 0) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerSlot(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerSlot, pickerRef, setPickerSlot]);

  const activeWin = effectiveTodayWin ?? todayWin;
  const winTasks = activeWin?.daily_win_tasks ?? [];
  const wonDay = winTasks.length > 0 && winTasks.every((t: Tables<'daily_win_tasks'>) => t.done);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <h3 className={`flex items-center gap-2 text-sm font-semibold ${wonDay ? 'text-dayC' : 'text-text-secondary'}`}>
          <Target size={15} className={wonDay ? 'text-dayC' : 'text-direction'} /> Pięć zwycięstw
        </h3>
        {activeWin && (activeWin.daily_win_tasks?.length ?? 0) > 0 && (
          <PowerListProgress
            done={(activeWin.daily_win_tasks ?? []).filter((t: Tables<'daily_win_tasks'>) => t.done).length}
            total={activeWin.daily_win_tasks?.length ?? 0}
            closed={activeWin.result === 'Z'}
          />
        )}
      </div>

      {!activeWin ? (
        <PowerListSetup
          yesterdayWin={yesterdayWin}
          yesterdayNote={yesterdayNote}
          setYesterdayNote={setYesterdayNote}
          yesterdayDayScore={yesterdayDayScore}
          setYesterdayDayScore={setYesterdayDayScore}
          yesterdayMoodScore={yesterdayMoodScore}
          setYesterdayMoodScore={setYesterdayMoodScore}
          yesterdayNoteRequired={yesterdayNoteRequired}
          toggleYesterdayTask={toggleYesterdayTask}
          savingYesterdayTaskIds={savingYesterdayTaskIds}
          direction={direction}
          fillSlotFromCheckpoint={fillSlotFromCheckpoint}
          occupiedSlots={occupiedSlots}
          newTaskForm={newTaskForm}
          updateSlot={updateSlot}
          todoItems={todoItems}
          pickerSlot={pickerSlot}
          setPickerSlot={setPickerSlot}
          pickerRef={pickerRef}
          startNewDay={startNewDay}
          submitting={submitting}
        />
      ) : (
        <PowerListActive
          checkpointPrompt={checkpointPrompt}
          setCheckpointPrompt={setCheckpointPrompt}
          markingCheckpoint={markingCheckpoint}
          confirmCheckpointDone={confirmCheckpointDone}
          todayWin={activeWin}
          projectMap={projectMap}
          toggleTask={toggleTask}
          eveningCloseDue={eveningCloseDue}
          eveningNote={eveningNote}
          setEveningNote={setEveningNote}
          savingEvening={savingEvening}
          saveEveningClose={saveEveningClose}
        />
      )}
    </section>
  );
}
