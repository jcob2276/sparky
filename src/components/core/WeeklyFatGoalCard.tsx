import { Target } from 'lucide-react';
import { useUserId } from '../../store/useStore';
import { useBodyFatGoal } from '../../lib/health/bodyFatGoalApi';
import type { BodyFatGoal } from '../../lib/health/bodyFatGoal';
import { formatLongDateWarsaw } from '../../lib/date';

const pl = (value: number) => String(value).replace('.', ',');

function headline(goal: BodyFatGoal): string {
  switch (goal.status) {
    case 'reached': return 'Cel osiągnięty. Czas na utrzymanie.';
    case 'rising': return `BF rośnie o ok. ${pl(goal.slopePpPerWeek ?? 0)} pkt na tydzień: cel się oddala.`;
    case 'flat': return 'BF stoi w miejscu: cel się nie zbliża.';
    case 'falling': return goal.trendEta ? `Przy obecnym spadku (${pl(goal.slopePpPerWeek ?? 0)} pkt na tydzień) cel wypada około ${formatLongDateWarsaw(goal.trendEta)}.` : `BF spada o ${pl(Math.abs(goal.slopePpPerWeek ?? 0))} pkt na tydzień, ale to za wolno na prognozę.`;
    default: return `Do prognozy trendu potrzebuję 3 pomiarów BF rozłożonych na 4 tygodnie (masz ${goal.bfPointsUsed}).`;
  }
}

/** Cel tłuszczu: ile brakuje, ile to kilogramów i scenariusz czasu; trend dopiero przy wystarczającej liczbie pomiarów. */
export default function WeeklyFatGoalCard() {
  const userId = useUserId();
  const { data } = useBodyFatGoal(userId);
  if (!data || data.status === 'no-data') return null;
  return (
    <section className="space-y-2 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
          <Target size={12} className="text-primary" /> Cel: {data.goal}% tłuszczu
        </p>
        <span className="text-sm font-semibold tabular-nums text-primary">{pl(data.currentBf ?? 0)}%</span>
      </div>
      <p className="text-sm font-semibold leading-snug text-text-primary">{headline(data)}</p>
      {data.status !== 'reached' && data.kgToLose != null && data.scenarioEta && (
        <p className="text-xs text-text-secondary">
          Brakuje {pl(data.remainingPp ?? 0)} pkt, czyli ok. {pl(data.kgToLose)} kg tłuszczu. Przy bezpiecznym tempie {pl(data.scenarioPaceKg)} kg na tydzień to około {formatLongDateWarsaw(data.scenarioEta)}.
        </p>
      )}
      {data.facts.length > 0 && <p className="text-xs text-text-secondary">{data.facts.join(' ')}</p>}
      <p className="text-2xs text-text-muted">Pomiar z {data.currentDate?.slice(5)}. Różne metody pomiaru (waga, obwody) dają różne wyniki, więc trend ma sens tylko w obrębie jednej metody.</p>
    </section>
  );
}
