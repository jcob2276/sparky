import { useMemo, useState } from 'react';
import { buildMonthPlan, monthEnd, summarizeProgress, type DayActual } from '../../lib/closer/monthPlan';
import { canCloseDay } from '../../lib/closer/monthPlanEntry';
import { useCloserRangeActuals, useSaveCloserDay } from '../../lib/closer/closerMonthLogsApi';
import { getTodayWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import { useStore } from '../../store/useStore';
import ContentContainer from '../shared/ContentContainer';
import PageHeader from '../shared/PageHeader';
import { MonthPlanEntryForm } from './MonthPlanEntryForm';
import { MonthPlanView } from './MonthPlanView';

const PLAN = { startDate: '2026-11-02', targetPln: 10000, showRate: 2 / 3, minSalesWeekDays: 3 };
const END_DATE = monthEnd(PLAN.startDate);

/** Tymczasowy plan listopada: minimum umówień na dzień i tydzień oraz wpisywanie liczb dnia do dziennika closera. */
function MonthPlanPage() {
  const userId = useStore((s) => s.session?.user?.id);
  const today = getTodayWarsaw();
  const inRange = today >= PLAN.startDate && today <= END_DATE;
  const [selectedDate, setSelectedDate] = useState(inRange ? today : PLAN.startDate);
  const plan = useMemo(() => buildMonthPlan(PLAN), []);
  const actualsQuery = useCloserRangeActuals(userId, PLAN.startDate, END_DATE);
  const actuals = useMemo(() => actualsQuery.data ?? {}, [actualsQuery.data]);
  const progress = useMemo(() => summarizeProgress(plan, actuals, today), [plan, actuals, today]);
  const save = useSaveCloserDay(userId);

  const saveDay = (date: string, day: DayActual) => {
    save.mutate({ date, day }, {
      onSuccess: () => notify(canCloseDay(day) ? 'Dzień zamknięty' : 'Zapisano liczby, dzień czeka na refleksję', 'success'),
      onError: (err) => notify(err instanceof Error ? err.message : 'Nie udało się zapisać dnia', 'error'),
    });
  };

  const selected = actuals[selectedDate];
  const formKey = `${selectedDate}:${JSON.stringify(selected ?? null)}`;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Plan listopada" subtitle="10 000 zł z umawiania i zamykania, plus refleksja i nauka" />
      <ContentContainer width="narrow">
        {actualsQuery.isError && (
          <p role="alert" className="mb-4 rounded-lg bg-warning/10 p-3 text-sm text-text-secondary">
            Nie wczytałem liczb z dziennika closera. Zapis dnia mógłby nadpisać zapisane liczby, więc poczekaj z wpisem.
          </p>
        )}
        <MonthPlanView
          plan={plan}
          progress={progress}
          actuals={actuals}
          today={today}
          targetPln={PLAN.targetPln}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          entry={(
            <MonthPlanEntryForm
              key={formKey}
              date={selectedDate}
              minDate={PLAN.startDate}
              maxDate={END_DATE}
              initial={selected}
              saving={save.isPending}
              disabled={actualsQuery.isPending || actualsQuery.isError}
              onDateChange={setSelectedDate}
              onSave={saveDay}
            />
          )}
        />
      </ContentContainer>
    </div>
  );
}

export default MonthPlanPage;
