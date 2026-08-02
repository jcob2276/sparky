import { ArrowRight, Link2, LockKeyhole, X } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { GroupedList, GroupedListRow } from '../../ui/GroupedList';
import PlanningCheckpointsStrip from '../../shared/PlanningCheckpointsStrip';
import type { TodoItemRow } from '../../../lib/todo/todo';
import type { useDirectionContext } from '../direction/hooks/useDirectionContext';
import type { DailyWinWithTasks, TaskSlot } from '../usePowerListData';
import { YesterdayRecap } from './PowerListSetupCards';
import PowerListSetupHeader from './PowerListSetupHeader';
import { PRIORITY_DOT, SPHERE_SLOTS } from './powerListConstants';
import TodoPicker from './TodoPicker';

interface Props {
  yesterdayWin: DailyWinWithTasks | null;
  yesterdayNote: string;
  setYesterdayNote: (value: string) => void;
  yesterdayDayScore: number;
  setYesterdayDayScore: (value: number) => void;
  yesterdayMoodScore: number;
  setYesterdayMoodScore: (value: number) => void;
  yesterdayNoteRequired: boolean;
  toggleYesterdayTask: (taskId: string) => void;
  savingYesterdayTaskIds: ReadonlySet<string>;
  direction: ReturnType<typeof useDirectionContext>;
  fillSlotFromCheckpoint: (checkpoint: { title: string; checkpointId: string; projectId: string }) => void;
  occupiedSlots: boolean[];
  newTaskForm: TaskSlot[];
  updateSlot: (index: number, update: Partial<TaskSlot>) => void;
  todoItems: TodoItemRow[];
  pickerSlot: number;
  setPickerSlot: (value: number) => void;
  pickerRef: React.RefObject<HTMLDivElement | null>;
  startNewDay: () => void;
  submitting: boolean;
}

export default function PowerListSetup({
  yesterdayWin, yesterdayNote, setYesterdayNote, yesterdayNoteRequired,
  toggleYesterdayTask, savingYesterdayTaskIds,
  yesterdayDayScore, setYesterdayDayScore, yesterdayMoodScore, setYesterdayMoodScore,
  direction, fillSlotFromCheckpoint, occupiedSlots,
  newTaskForm, updateSlot, todoItems, pickerSlot,
  setPickerSlot, pickerRef, startNewDay, submitting,
}: Props) {
  const filledCount = newTaskForm.filter((slot) => slot.task.trim()).length;
  const reflectionReady = !yesterdayNoteRequired || Boolean(yesterdayNote.trim());
  const ready = reflectionReady && filledCount === 5;
  const missingTasks = 5 - filledCount;

  return (
    <div className="space-y-5">
      <PowerListSetupHeader
        reflectionRequired={yesterdayNoteRequired}
        reflectionReady={reflectionReady}
        filledCount={filledCount}
      />

      <YesterdayRecap
        yesterdayWin={yesterdayWin}
        yesterdayNote={yesterdayNote}
        setYesterdayNote={setYesterdayNote}
        yesterdayNoteRequired={yesterdayNoteRequired}
        dayScore={yesterdayDayScore}
        setDayScore={setYesterdayDayScore}
        moodScore={yesterdayMoodScore}
        setMoodScore={setYesterdayMoodScore}
        onToggleYesterdayTask={toggleYesterdayTask}
        savingYesterdayTaskIds={savingYesterdayTaskIds}
      />

      <PlanningCheckpointsStrip
        checkpoints={[...direction.checkpoints.overdue, ...direction.checkpoints.upcoming]}
        loading={direction.loading}
        onFillSlot={fillSlotFromCheckpoint}
        occupiedSlots={occupiedSlots}
      />

      <section className="space-y-3" aria-labelledby="daily-plan-title">
        <header className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="ios-section-label">Plan dnia</p>
            <h3 id="daily-plan-title" className="mt-1 text-lg font-semibold tracking-tight text-text-primary">
              Pięć dzisiejszych zwycięstw
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Wpisz własne zadania lub połącz je z To-do. Data zadania nie zostanie zmieniona.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-text-secondary" aria-live="polite">
            {filledCount}/5
          </span>
        </header>

        <div ref={pickerRef}>
          <GroupedList aria-label="Plan dnia">
            {newTaskForm.map((slot, index) => {
              const sphere = index < 3 ? SPHERE_SLOTS[index] : null;
              const SphereIcon = sphere?.icon;
              const linkedTodo = todoItems.find((item) => item.id === slot.todoId);
              return (
                <GroupedListRow key={index} className="ui-plan-slot-row py-1">
                  <div className="flex min-h-12 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-text-secondary">
                      {index + 1}
                    </span>
                    {sphere && SphereIcon ? (
                      <Badge variant="tag" className="shrink-0">
                        <SphereIcon size={9} aria-hidden="true" /> {sphere.label}
                      </Badge>
                    ) : (
                      <Badge variant="tag" className="shrink-0">Własne</Badge>
                    )}

                    {slot.todoId ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2 py-3">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[linkedTodo?.priority ?? ''] || 'bg-info'}`} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                          {slot.task}
                        </span>
                      </div>
                    ) : (
                      <ControlInput
                        aria-label={`Zwycięstwo ${index + 1}`}
                        placeholder={sphere?.placeholder ?? `Zadanie ${index + 1}`}
                        value={slot.task}
                        onChange={(event) => updateSlot(index, { task: event.target.value })}
                        className="min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-text-primary shadow-none placeholder:text-text-muted"
                      />
                    )}

                    <Pressable
                      aria-label={slot.todoId ? `Usuń powiązanie: ${slot.task}` : `Połącz zwycięstwo ${index + 1} z To-do`}
                      onClick={() => slot.todoId
                        ? updateSlot(index, { task: '', todoId: null })
                        : setPickerSlot(pickerSlot === index ? -1 : index)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${pickerSlot === index ? 'bg-primary/12 text-primary' : 'text-text-muted hover:bg-surface-3 hover:text-primary'}`}
                    >
                      {slot.todoId ? <X size={16} /> : <Link2 size={16} />}
                    </Pressable>
                  </div>

                  {pickerSlot === index && (
                    <TodoPicker
                      items={todoItems.filter((item) => !newTaskForm.some(
                        (candidate, candidateIndex) => candidateIndex !== index && candidate.todoId === item.id,
                      ))}
                      onSelect={(item) => updateSlot(index, {
                        task: item.title,
                        todoId: item.id,
                        checkpointId: null,
                        pinId: null,
                      })}
                      onClose={() => setPickerSlot(-1)}
                    />
                  )}
                </GroupedListRow>
              );
            })}
          </GroupedList>
        </div>
      </section>

      <div className="space-y-3">
        <p className="flex min-h-5 items-center justify-center gap-1.5 text-center text-sm text-text-secondary" aria-live="polite">
          {ready
            ? 'Wszystko gotowe. Możesz zacząć dzień.'
            : !reflectionReady
              ? <><LockKeyhole size={14} /> Najpierw zapisz krótką refleksję.</>
              : <><LockKeyhole size={14} /> {missingTasks === 1 ? 'Brakuje jednego zadania.' : `Brakuje ${missingTasks} zadań.`}</>}
        </p>
        <Button
          size="lg"
          className="w-full"
          onClick={startNewDay}
          disabled={!ready}
          loading={submitting}
          icon={ready ? <ArrowRight size={17} /> : <LockKeyhole size={16} />}
        >
          {submitting ? 'Zapisywanie…' : ready ? 'Zacznij dzień' : 'Dokończ rytuał'}
        </Button>
      </div>
    </div>
  );
}
