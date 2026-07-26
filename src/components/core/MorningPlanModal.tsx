/**
 * @component MorningPlanModal
 * @role Swobodny plan dnia: własne działania, opcjonalne sugestie Todo i time-boxing.
 */
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import { getWeekStartWarsaw } from '../../lib/growth/growth';
import { useUserId } from '../../store/useStore';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import MorningPlanFooterActions from './morningPlan/MorningPlanFooterActions';
import MorningPlanStep2PowerList from './morningPlan/MorningPlanStep2PowerList';
import MorningPlanStep3TimeBox from './morningPlan/MorningPlanStep3TimeBox';
import MorningPlanWeekStrip from './morningPlan/MorningPlanWeekStrip';
import { useMorningPlanActions } from './morningPlan/useMorningPlanActions';
import { useMorningPlanData } from './morningPlan/useMorningPlanData';

interface Props {
  onClose: () => void;
  targetDate?: string;
}

export default function MorningPlanModal({ onClose, targetDate }: Props) {
  const userId = useUserId();
  const actualToday = getTodayWarsaw();
  const planningDate = targetDate ?? actualToday;
  const planningTomorrow = planningDate !== actualToday;
  const dayWord = planningTomorrow ? 'jutro' : 'dziś';
  const dayWordGen = planningTomorrow ? 'jutrzejszego' : 'dzisiejszego';
  const [step, setStep] = useState<1 | 2>(1);
  const data = useMorningPlanData({ userId, planningDate, isPlanningTomorrow: planningTomorrow });
  const actions = useMorningPlanActions({
    userId,
    planningDate,
    onClose,
    yesterdayTasks: data.yesterdayTasks,
    setYesterdayTasks: data.setYesterdayTasks,
    setTodayTasks: data.setTodayTasks,
    setInboxTasks: data.setInboxTasks,
    powerList: data.powerList,
    setPowerList: data.setPowerList,
    todayWinId: data.todayWinId,
    times: data.times,
    durations: data.durations,
    weekCalendarEvents: data.weekCalendarEvents,
  });

  const weekStart = useMemo(() => getWeekStartWarsaw(planningDate), [planningDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => shiftDateStr(weekStart, index)),
    [weekStart],
  );
  const uniqueSuggestions = new Map<string, (typeof data.todayTasks)[number]>();
  [...data.todayTasks, ...data.inboxTasks].forEach((task) => uniqueSuggestions.set(task.id, task));
  const suggestions = [...uniqueSuggestions.values()];

  if (data.loading) {
    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-6" size="xs" closeOnBackdropClick={false}>
        <div className="flex flex-col items-center gap-3">
          <Spinner size="md" />
          <span className="text-sm font-bold text-text-muted">Wczytywanie planowania…</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-0" overflowY={false} size="lg">
      <div className="relative w-full max-w-lg bg-background border border-border-custom/60 flex flex-col max-h-[var(--ds-h-85vh)] overflow-hidden">
        <header className="p-4 border-b border-border-custom/20 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-text-primary uppercase tracking-wider">
              {planningTomorrow ? 'Zaplanuj jutro' : 'Zaplanuj dzień'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold text-text-muted">{planningDate}</span>
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">Krok {step} z 2</span>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" icon={<X size={18} />} />
        </header>

        <MorningPlanWeekStrip
          weekDays={weekDays}
          planningDate={planningDate}
          actualToday={actualToday}
          weekCalendarEvents={data.weekCalendarEvents}
          weekTaskCounts={data.weekTaskCounts}
        />

        <div className="grid grid-cols-2 h-1 bg-border-custom/20">
          <div className="h-full bg-primary" />
          <div className={`h-full ${step === 2 ? 'bg-primary' : 'bg-transparent'}`} />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <MorningPlanStep2PowerList
              powerList={data.powerList}
              suggestions={suggestions}
              dayWord={dayWord}
              onEditSlot={actions.handleEditSlot}
              onAssign={actions.handleAssignToSlot}
              onClear={actions.handleClearSlot}
            />
          ) : (
            <MorningPlanStep3TimeBox
              powerList={data.powerList}
              times={data.times}
              durations={data.durations}
              setTimes={data.setTimes}
              setDurations={data.setDurations}
              capacityHoursPlanned={actions.capacityHoursPlanned}
              capacityPct={actions.capacityPct}
              isOverloaded={actions.isOverloaded}
              calendarMeetingMinutes={actions.calendarMeetingMinutes}
              totalMinutesPlanned={actions.totalMinutesPlanned}
              timelineBlocks={actions.timelineBlocks}
              dayWord={dayWord}
              dayWordGen={dayWordGen}
            />
          )}
        </div>

        <MorningPlanFooterActions
          step={step}
          setStep={setStep}
          planningTomorrow={planningTomorrow}
          sending={actions.sending}
          onSubmit={actions.handleSubmitPlan}
        />
      </div>
    </Modal>
  );
}
