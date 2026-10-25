import WeekLoopSummary from '../shared/WeekLoopSummary';
import ProjectWeekKpis from './ProjectWeekKpis';
import { useDirectionContext } from './direction/hooks/useDirectionContext';
import { Card } from '../ui/Card';
import Skeleton from '../ui/Skeleton';

/** Read-only week hub snapshot at the top of Sunday planning — same data as WeekHub radar. */
export default function WeekPlanningRecap({
  userId,
  weekStart,
}: {
  userId: string;
  weekStart: string;
}) {
  const direction = useDirectionContext(userId, weekStart);

  if (direction.loading) {
    return (
      <Skeleton variant="card" lines={3} />
    );
  }

  const errorNotice = direction.isError ? (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        Nie udało się wczytać podsumowania tygodnia{direction.error?.message ? `: ${direction.error.message}` : '.'}
      </div>
  ) : null;
  if (!direction.hasData) return errorNotice;

  const hasProjects = (direction.activeProjects?.length ?? 0) > 0;
  const hasLoop =
    direction.weekGoals?.cialo ||
    direction.weekGoals?.duch ||
    direction.weekGoals?.konto ||
    (direction.powerListStats?.tasksSet ?? 0) > 0;

  if (!hasProjects && !hasLoop) return errorNotice;

  return (
    <Card variant="receipt" className="space-y-4" style={{ background: 'var(--primary-5)' }}>
      {errorNotice}
      <div>
        <p className="text-2xs font-semibold text-primary">
          Ten tydzień — zoom out
        </p>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
          To samo co w Radarze tygodnia. Teraz refleksja — nie zaczynaj od pustego formularza.
        </p>
      </div>

      {hasLoop && (
        <WeekLoopSummary
          compact
          ctx={{
            weekGoals: direction.weekGoals ?? { intention: null, commitment: null, cialo: null, duch: null, konto: null },
            focus: direction.focus ?? { skillId: null, skillLabel: null, subskillLabel: null, targetLevel: null },
          }}
        />
      )}

      {hasProjects && direction.weekStart && (
        <ProjectWeekKpis
          readOnly
          userId={userId}
          projects={direction.activeProjects!}
          weekStart={direction.weekStart}
          focusProjectIds={direction.sprintFocusProjectIds ?? []}
        />
      )}
    </Card>
  );
}
