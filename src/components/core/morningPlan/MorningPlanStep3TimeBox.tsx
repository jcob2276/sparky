import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { AlertTriangle, X } from 'lucide-react';
import DayTimeline from '../../shared/DayTimeline';
import { TodoSlot } from './types';
import { CAPACITY_HOURS } from './useMorningPlanData';
import type { TimelineBlock } from '../../shared/DayTimeline';

interface Props {
  powerList: (TodoSlot | null)[];
  times: Record<string, string>;
  durations: Record<string, number>;
  setTimes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setDurations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  capacityHoursPlanned: number;
  capacityPct: number;
  isOverloaded: boolean;
  calendarMeetingMinutes: number;
  totalMinutesPlanned: number;
  timelineBlocks: TimelineBlock[];
  dayWord: string;
  dayWordGen: string;
}

export default function MorningPlanStep3TimeBox({
  powerList,
  times,
  durations,
  setTimes,
  setDurations,
  capacityHoursPlanned,
  capacityPct,
  isOverloaded,
  calendarMeetingMinutes,
  totalMinutesPlanned,
  timelineBlocks,
  dayWord,
  dayWordGen,
}: Props) {
  const activeTasks = powerList.filter(Boolean);

  const handleClearTime = (taskId: string) => {
    setTimes((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-text-primary">Godziny i kalendarz</h3>
          <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Opcjonalnie</span>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Możesz usadzić zadania w czasie ({dayWord}) lub od razu zatwierdzić plan przyciskiem poniżej.
        </p>
      </div>

      {/* Workload Capacity indicator */}
      <div className="p-3.5 bg-surface-2 dark:bg-on-accent/[0.015] border border-border-custom/50 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Zapełnienie {dayWordGen} dnia</span>
          <span className={`text-xs font-black ${isOverloaded ? 'text-danger' : 'text-primary'}`}>
            {capacityHoursPlanned}h / {CAPACITY_HOURS}h
          </span>
        </div>
        <div className="h-2 rounded-full bg-border-custom/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-[var(--motion-slow)] ${
              isOverloaded ? 'bg-danger' : capacityPct > 75 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
        {isOverloaded && (
          <div className="flex items-start gap-1.5 p-2 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs font-semibold">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>Ostrzeżenie przed przeładowaniem! Zaplanowany czas przekracza 8h. Rozważ odłożenie części zadań.</span>
          </div>
        )}
        <div className="text-2xs text-text-muted/70 font-semibold flex items-center justify-between pt-0.5">
          <span>Spotkania w kalendarzu: {Math.round((calendarMeetingMinutes / 60) * 10) / 10}h</span>
          <span>Zaplanowane zadania: {Math.round(((totalMinutesPlanned - calendarMeetingMinutes) / 60) * 10) / 10}h</span>
        </div>
      </div>

      {/* Visual day timeline */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold text-text-muted uppercase tracking-wider">Podgląd kalendarza {dayWordGen} dnia</span>
          <span className="text-2xs text-text-muted/60">07:00 – 22:00</span>
        </div>
        <DayTimeline blocks={timelineBlocks} />
      </div>

      {/* Today's Tasks scheduling list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold text-text-muted uppercase tracking-wider block">Godziny zadań (opcjonalnie)</span>
          <span className="text-2xs text-text-muted/60">Nie musisz uzupełniać wszystkich</span>
        </div>

        <div className="space-y-2 max-h-[var(--ds-h-220px)] overflow-y-auto pr-1">
          {activeTasks.map((task) => {
            const hasTime = Boolean(times[task!.id]);
            return (
              <div
                key={task!.id}
                className="p-3 bg-surface-2 dark:bg-on-accent/[0.01] border border-border-custom/30 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-text-primary block truncate">{task!.title}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block text-2xs font-bold uppercase px-1.5 py-0.5 rounded bg-warning/10 text-warning tracking-wider">
                      Power List
                    </span>
                    {!hasTime && (
                      <span className="text-2xs text-text-muted/70 font-medium">brak godziny</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center">
                    <ControlInput
                      type="time"
                      value={times[task!.id] || ''}
                      onChange={(e) => setTimes((prev) => ({ ...prev, [task!.id]: e.target.value }))}
                      className="rounded-xl border border-border-custom/60 bg-surface-solid/50 px-2 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-primary/40 cursor-pointer"
                      style={{ width: 'var(--ds-inline-style-85)' }}
                    />
                    {hasTime && (
                      <Pressable
                        type="button"
                        onClick={() => handleClearTime(task!.id)}
                        className="ml-1 p-1 hover:bg-surface-3 rounded-lg text-text-muted hover:text-text-primary transition-colors"
                        title="Usuń godzinę"
                      >
                        <X size={12} />
                      </Pressable>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-surface-solid/40 border border-border-custom/40 rounded-xl px-2 py-1">
                    <ControlInput
                      type="number"
                      min="5"
                      step="5"
                      value={durations[task!.id] || 30}
                      onChange={(e) =>
                        setDurations((prev) => ({ ...prev, [task!.id]: Math.max(5, Number(e.target.value)) }))
                      }
                      className="bg-transparent text-xs font-bold text-text-primary w-8 text-center outline-none"
                    />
                    <span className="text-2xs text-text-muted font-bold">m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
