/**
 * @component PowerList
 * @role Codzienna lista 5 zadań (setup vs. tryb aktywny) — trzon zakładki DZIŚ.
 * @composes powerList/PowerListSetup, powerList/PowerListActive (obie używają powerList/TodoPicker)
 * @folders hooks/ = usePowerListActions, usePowerListEffects (wrapowane przez usePowerListData)
 * @usedBy DashboardDzisTab
 */
import { useEffect } from 'react';
import { Target } from 'lucide-react';
import { usePowerListData } from './usePowerListData';

import PowerListSetup from './powerList/PowerListSetup';
import PowerListActive from './powerList/PowerListActive';

import { type DailyWinWithTasks } from './usePowerListData';
import type { Tables } from '../../lib/database.types';

export interface PowerListProps {
  todayWin: DailyWinWithTasks | null;
  onUpdate?: (data: Record<string, unknown>) => void;
  planDaySignal?: number;
}

export default function PowerList({
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

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
          <Target size={15} className="text-direction" /> Pięć zwycięstw
        </h3>
        {activeWin?.result === 'Z' ? (
          <div className="rounded-full border border-dayC/15 bg-dayC/10 px-2.5 py-0.5 font-display text-2xs font-bold text-dayC">
            Dzień wygrany
          </div>
        ) : activeWin && (() => {
          const tasks = activeWin.daily_win_tasks || [];
          const total = tasks.length;
          const doneCount = tasks.filter((t: Tables<'daily_win_tasks'>) => t.done).length;
          return total > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                {Array.from({ length: total }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i < doneCount ? 'bg-dayC' : 'bg-border-custom'
                    }`}
                  />
                ))}
              </div>
              <span className="font-display text-2xs font-bold text-text-muted">
                {doneCount}/{total}
              </span>
            </div>
          ) : null;
        })()}
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
