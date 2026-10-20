/**
 * @component MorningPlanLearningSlot
 * @role Start dnia: dzisiejszy slot nauki z planu miesiąca (z jednym kliknięciem „zrobione”).
 * Gdy na miesiąc nie ma planu, przypomina, żeby go ustawić w Rozwoju.
 */
import { dailySlot } from '../../../lib/learning/learningModel';
import LearningSlotButton from '../../growth/learning/LearningSlotButton';
import { useLearningMonth, useLogLearningProgress } from '../../growth/learning/useLearningPlan';
import DataStateNotice from '../DataStateNotice';
import Skeleton from '../../ui/Skeleton';

export default function MorningPlanLearningSlot({ userId }: { userId: string }) {
  const month = useLearningMonth(userId);
  const log = useLogLearningProgress();

  if (month.isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />;
  if (month.error) {
    return <DataStateNotice tone="warning" title="Nie udało się wczytać planu nauki" detail={month.error.message} />;
  }

  const visible = month.assignments.filter((a) => a.status === 'active' || (month.loggedToday[a.id] ?? 0) > 0);

  if (visible.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-warning/40 bg-warning/[0.05] p-4" aria-labelledby="learning-missing">
        <h3 id="learning-missing" className="text-sm font-black text-text-primary">Brak planu nauki na ten miesiąc</h3>
        <p className="mt-0.5 text-xs text-text-secondary">Wybierz do 3 materiałów w zakładce Rozwój, a tu pojawi się dzienny slot.</p>
      </section>
    );
  }

  const busyId = log.isPending ? log.variables?.assignmentId ?? null : null;

  return (
    <section className="rounded-2xl border border-border-custom/40 bg-surface/40 p-4 space-y-3" aria-labelledby="learning-today">
      <h3 id="learning-today" className="text-xs font-black uppercase tracking-wider text-text-muted">Nauka na dziś</h3>
      <ul className="space-y-3">
        {visible.map((assignment) => {
          const logged = month.loggedToday[assignment.id] ?? 0;
          return (
            <li key={assignment.id} className="space-y-1.5 border-t border-border-custom/20 pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-black text-text-primary leading-snug">{assignment.title}</p>
              <LearningSlotButton
                assignment={assignment}
                today={month.today}
                loggedToday={logged}
                busy={busyId === assignment.id}
                onToggle={() =>
                  log.mutate({
                    assignmentId: assignment.id,
                    date: month.today,
                    amount: logged > 0 ? 0 : dailySlot(assignment, month.today, logged).amount,
                  })
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
