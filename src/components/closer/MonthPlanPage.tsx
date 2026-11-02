import { useMemo } from 'react';
import { buildMonthPlan, monthEnd, summarizeProgress } from '../../lib/closer/monthPlan';
import { useCloserRangeActuals } from '../../lib/closer/closerMonthLogsApi';
import { getTodayWarsaw } from '../../lib/date';
import { useStore } from '../../store/useStore';
import ContentContainer from '../shared/ContentContainer';
import PageHeader from '../shared/PageHeader';
import { MonthPlanView } from './MonthPlanView';

const PLAN = { startDate: '2026-11-02', targetPln: 10000, showRate: 2 / 3, minSalesWeekDays: 3 };

/** Tymczasowy plan listopada: minimum umówień na dzień i tydzień oraz sprzedaże z dziennika closera. */
function MonthPlanPage() {
  const userId = useStore((s) => s.session?.user?.id);
  const today = getTodayWarsaw();
  const plan = useMemo(() => buildMonthPlan(PLAN), []);
  const actualsQuery = useCloserRangeActuals(userId, PLAN.startDate, monthEnd(PLAN.startDate));
  const actuals = useMemo(() => actualsQuery.data ?? {}, [actualsQuery.data]);
  const progress = useMemo(() => summarizeProgress(plan, actuals, today), [plan, actuals, today]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Plan listopada" subtitle="10 000 zł z umawiania i zamykania" />
      <ContentContainer width="narrow">
        {actualsQuery.isError && (
          <p role="alert" className="mb-4 rounded-xl bg-warning/10 p-3 text-sm text-text-secondary">
            Nie wczytałem liczb z dziennika closera, więc pokazuję sam plan.
          </p>
        )}
        <MonthPlanView plan={plan} progress={progress} actuals={actuals} today={today} targetPln={PLAN.targetPln} />
      </ContentContainer>
    </div>
  );
}

export default MonthPlanPage;
