import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import type { DueReview } from '../../lib/goal/reviewCycle';
import {
  PILLARS,
  type GoalStatuses,
  type Pillar,
  type PillarGoals,
  type PillarScores,
  type ReviewAnswers,
  type ReviewContext,
} from '../../lib/goal/reviewCycle.data';
import ReviewNav from './ReviewNav';
import ReviewPillarCard from './ReviewPillarCard';
import ReviewStepContract from './ReviewStepContract';
import ReviewStepMirror from './ReviewStepMirror';
import ReviewStepper from './ReviewStepper';
import ReviewZoomPanel from './ReviewZoomPanel';

const COPY = {
  week: { title: 'Zamknięcie tygodnia', horizon: 'na następny tydzień' },
  month: { title: 'Zamknięcie miesiąca', horizon: 'na następne 4 tygodnie' },
  sprint: { title: 'Zamknięcie sprintu', horizon: 'na następne 12 tygodni' },
} as const;

/** Strony: 0 lustro, 1–3 filary (po jednym), 4 kontrakt. */
const LAST_PAGE = PILLARS.length + 1;
const stepOf = (page: number): 0 | 1 | 2 => (page === 0 ? 0 : page === LAST_PAGE ? 2 : 1);

export default function ReviewForm({
  userId,
  due,
  context,
  facts,
  gaps,
  saving,
  remaining,
  onSubmit,
}: {
  userId?: string;
  due: DueReview;
  context: ReviewContext | undefined;
  facts: string[];
  gaps: string[];
  saving: boolean;
  /** Ile przeglądów jeszcze czeka po tym. */
  remaining: number;
  onSubmit: (answers: ReviewAnswers) => void;
}) {
  const copy = COPY[due.kind];
  const [page, setPage] = useState(0);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [scores, setScores] = useState<Partial<PillarScores>>({});
  const [goals, setGoals] = useState<Partial<PillarGoals>>({});
  const [note, setNote] = useState('');
  const [goalStatuses, setGoalStatuses] = useState<GoalStatuses>({});
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView?.({ block: 'start' });
  }, [page]);

  const pillar = page >= 1 && page <= PILLARS.length ? PILLARS[page - 1] : null;
  const hasGoal = (key: Pillar) => (goals[key] ?? '').trim().length > 0;
  const missingGoals = PILLARS.filter(({ key }) => !hasGoal(key)).map(({ label }) => label);

  const submit = () =>
    onSubmit({
      scores: scores as PillarScores,
      goals: goals as PillarGoals,
      note,
      // Rozliczenie liczy się tylko tam, gdzie był poprzedni cel.
      goalStatus: Object.fromEntries(
        Object.entries(goalStatuses).filter(([key]) => context?.previousGoals?.[key as Pillar]),
      ) as GoalStatuses,
    });

  const nav = (() => {
    if (page === LAST_PAGE) {
      return {
        label: saving ? 'Zapisuję…' : 'Zamknij i ustaw cele',
        disabled: missingGoals.length > 0,
        hint: missingGoals.length > 0 ? `Brakuje celów: ${missingGoals.join(', ')}` : null,
        action: submit,
      };
    }
    if (pillar) {
      const missingScore = scores[pillar.key] === undefined;
      return {
        label: page === PILLARS.length ? 'Do kontraktu' : 'Dalej',
        disabled: missingScore,
        hint: missingScore ? `Wybierz ocenę: ${pillar.label}` : null,
        action: () => setPage(page + 1),
      };
    }
    return { label: 'Dalej', disabled: false, hint: null, action: () => setPage(1) };
  })();

  return (
    <div className="space-y-5">
      <header ref={topRef} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xs font-bold text-warning">
            {copy.title}
            {remaining > 0 ? ` · jeszcze ${remaining} po tym` : ''}
          </p>
          {due.kind === 'week' && context?.ladder && (
            <Button variant="tonal" size="sm" icon={<Target size={12} />} onClick={() => setSprintOpen(true)}>
              Cały sprint
            </Button>
          )}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary">{due.label}</h2>
        <ReviewStepper step={stepOf(page)} />
      </header>

      {page === 0 && <ReviewStepMirror userId={userId} due={due} context={context} facts={facts} gaps={gaps} />}

      {pillar && (
        <ReviewPillarCard
          key={pillar.key}
          pillar={pillar.key}
          label={pillar.label}
          position={`${page}/${PILLARS.length}`}
          context={context}
          score={scores[pillar.key]}
          status={goalStatuses[pillar.key]}
          onScore={(value) => setScores((prev) => ({ ...prev, [pillar.key]: value }))}
          onStatus={(status) => setGoalStatuses((prev) => ({ ...prev, [pillar.key]: status }))}
        />
      )}

      {page === LAST_PAGE && (
        <ReviewStepContract
          horizon={copy.horizon}
          goals={goals}
          scores={scores}
          note={note}
          context={context}
          onGoal={(key, value) => setGoals((prev) => ({ ...prev, [key]: value }))}
          onNote={setNote}
        />
      )}

      <ReviewNav
        onBack={page > 0 ? () => setPage(page - 1) : undefined}
        onNext={nav.action}
        nextLabel={nav.label}
        disabled={nav.disabled}
        hint={nav.hint}
        loading={saving}
      />

      <Sheet open={sprintOpen} onOpenChange={setSprintOpen} side="bottom" compact aboveFullscreen title="Dokąd to prowadzi">
        <ReviewZoomPanel context={context} due={due} embedded />
      </Sheet>
    </div>
  );
}
