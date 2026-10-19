import { useState } from 'react';
import { ControlSelect, ControlTextarea, Pressable } from '../../ui/ControlPrimitives';
import { readPlanSnapshot, type PlanVersion, type PlannedWorkout, type CoachJobRow, type RunningActivity } from '../../../lib/health/trainingPlanApi';
import PlannedRunMatch from './PlannedRunMatch';

interface Props {
  versions: PlanVersion[]; sessions: PlannedWorkout[]; jobs: CoachJobRow[]; busy: boolean; error: string | null;
  generate: (weeks: number, instructions: string) => void; approve: (version: PlanVersion) => void;
  revert: (version: PlanVersion) => void; start?: (workout: PlannedWorkout) => void;
  runs?: RunningActivity[]; match?: (workout: PlannedWorkout, activityId: number) => void;
}
export default function TrainingPlanPreview({ versions, sessions, jobs, busy, error, generate, approve, revert, start, runs = [], match }: Props) {
  const [weeks, setWeeks] = useState(4), [instructions, setInstructions] = useState('');
  const [showAll, setShowAll] = useState(false);
  const active = versions.find(version => version.status === 'active');
  const draft = versions.find(version => version.status === 'draft' && version.base_revision === (active?.revision ?? 0));
  const snapshot = readPlanSnapshot(draft?.snapshot);
  const generating = jobs.some(job => job.status === 'running' || job.status === 'queued');
  const current = sessions.filter(session => !session.completed && !session.skipped_at);
  return <section className="rounded-xl border border-border-custom bg-surface p-3 space-y-3" aria-label="Wspólny plan treningowy">
    <h2 className="text-sm font-bold text-text-primary">Twój plan: bieganie, siła i umiejętności</h2>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {active && <p className="text-3xs text-text-secondary">Aktywna wersja {active.revision}. Zmiana planu zachowuje zapisane i rozpoczęte treningi.</p>}
    {(showAll ? current : current.slice(0, 3)).map(session => <article key={session.id} className="border-b border-border-custom pb-2.5 space-y-0.5">
      <p className="text-3xs text-text-secondary">{session.planned_date} · {session.target_duration_min ?? '—'} min</p>
      <h3 className="text-sm font-semibold leading-snug">{session.workout_name}</h3>
      <p className="text-xs text-text-secondary">{session.goal}</p>
      <p className="text-xs whitespace-pre-wrap text-text-secondary/90">{session.description}</p>
      {start && <Pressable variant="secondary" size="sm" disabled={busy} onClick={() => start(session)}>Rozpocznij sesję</Pressable>}
      {match && /run|bieg/i.test(session.workout_type) && <PlannedRunMatch workout={session} runs={runs} busy={busy} match={match} />}
    </article>)}
    {current.length > 3 && <Pressable variant="secondary" size="sm" onClick={() => setShowAll(value => !value)}>{showAll ? 'Pokaż najbliższe sesje' : `Pokaż cały blok (${current.length} sesji)`}</Pressable>}
    {!active && !generating && <p className="text-xs text-text-secondary">Zapisz cele i warunki poniżej. Sparky zaproponuje blok na Twoich danych.</p>}
    {snapshot && draft && <details open className="space-y-3 rounded-xl bg-surface-2 p-3">
      <summary className="cursor-pointer font-semibold">Propozycja: {snapshot.title}</summary>
      <p className="text-xs whitespace-pre-wrap">{snapshot.progression}</p>
      {snapshot.changes?.map(change => <div key={change.sessionKey} className="rounded-lg border border-border-custom p-3 text-xs space-y-1">
        <p className="font-semibold">Co się zmieni</p>
        <p>Przed: {change.before.name} · {change.before.durationMinutes} min · {change.before.exercises.reduce((sum,exercise)=>sum+exercise.sets,0)} serii</p>
        <p>Po: {change.after.name} · {change.after.durationMinutes} min · {change.after.exercises.reduce((sum,exercise)=>sum+exercise.sets,0)} serii</p>
        {change.why.map((reason,index)=><p key={index} className="text-text-secondary">{reason}</p>)}
      </div>)}
      <ul className="text-xs list-disc pl-4">{snapshot.tradeoffs?.map((note, index) => <li key={index}>{note}</li>)}</ul>
      <p className="text-xs">Lżejsze tygodnie: {snapshot.deloadWeeks?.join(', ') || 'według regeneracji'}</p>
      {snapshot.sessions.map(session => <div key={session.key} className="border-t border-border-custom pt-2 text-xs space-y-1">
        <p className="font-semibold">{session.date} · {session.name} · {session.durationMinutes} min</p>
        <p>{session.goal}</p>
        <p>Rozgrzewka {session.warmupMinutes} min · wyciszenie {session.cooldownMinutes} min</p>
        {session.exercises.map((exercise, index) => <p key={index}>{exercise.name}: {exercise.sets}×{exercise.reps}, RIR {exercise.rir}, przerwa {exercise.restSeconds}s{exercise.weightKg != null ? `, ${exercise.weightKg} kg` : ', ciężar według wysiłku'}</p>)}
        <p className="text-text-secondary whitespace-pre-wrap">{session.notes}</p>
      </div>)}
      <Pressable variant="primary" disabled={busy} onClick={() => approve(draft)}>Zatwierdź ten plan</Pressable>
    </details>}
    {generating && <p role="status" className="text-sm text-text-secondary">Sparky przygotowuje plan. Możesz zamknąć ten ekran; wynik zostanie zapisany.</p>}
    {jobs[0]?.status === 'failed' && <p role="alert" className="text-sm text-danger">Nie udało się przygotować planu. {jobs[0].last_error} Możesz spróbować ponownie.</p>}
    <details className="space-y-3"><summary className="cursor-pointer text-sm font-semibold">{active ? 'Zaproponuj nowy blok' : 'Przygotuj plan'}</summary>
      <label className="block text-xs">Długość bloku <ControlSelect value={weeks} onChange={e => setWeeks(Number(e.target.value))} className="p-2 rounded-lg bg-surface-2">
        {[4, 6, 8, 12].map(value => <option key={value} value={value}>{value} tygodni</option>)}
      </ControlSelect></label>
      <label className="block text-xs">Co uwzględnić w tym bloku?
        <ControlTextarea rows={3} value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={2000} className="w-full p-2 rounded-lg bg-surface-2" />
      </label>
      <Pressable variant="primary" disabled={busy || generating} onClick={() => generate(weeks, instructions)}>Przygotuj propozycję</Pressable>
    </details>
    {active?.previous_version_id && <Pressable variant="secondary" disabled={busy} onClick={() => revert(active)}>Cofnij ostatnią zmianę planu</Pressable>}
  </section>;
}
