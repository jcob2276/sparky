import type { CoachDecision } from '@vanguard/domain';
import { Pressable } from '../../ui/ControlPrimitives';
const TITLES = { unknown:'Gotowość wymaga doprecyzowania',keep:'Zachowaj ustaloną sesję',reduce:'Proponuję lżejszą sesję',recover:'Najpierw regeneracja i wyjaśnienie ograniczeń' };
export default function CoachDecisionCard({ decision, error, busy, prepared, propose, openTraining }: {
  decision: CoachDecision | null; error: string | null; busy: boolean; prepared: boolean; propose: () => void; openTraining: () => void;
}) {
  return <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3" aria-label="Decyzja treningowa na dziś">
    <h2 className="text-sm font-bold">{decision ? TITLES[decision.recommendation] : 'Plan i gotowość na dziś'}</h2>
    {error && <p className="text-xs text-text-secondary">{error}</p>}
    {decision?.original && <p className="text-sm">{decision.original.name} · {decision.original.durationMinutes} min</p>}
    {decision?.reasons.map((reason,index) => <p className="text-xs text-text-secondary" key={index}>{reason}</p>)}
    {decision?.missing.map((missing,index) => <p className="text-xs text-text-secondary" key={index}>{missing}</p>)}
    {decision?.replacement && <div className="text-xs space-y-1">
      <p className="font-semibold">Proponowana zmiana: {decision.replacement.name} · {decision.replacement.durationMinutes} min</p>
      {decision.replacement.exercises.map((exercise,index)=><p key={index}>{exercise.name}: {exercise.sets}×{exercise.reps}, RIR {exercise.rir}</p>)}
      {!prepared && <Pressable variant="secondary" size="sm" disabled={busy} onClick={propose}>{busy ? 'Przygotowywanie…' : 'Przygotuj korektę do zatwierdzenia'}</Pressable>}
    </div>}
    {prepared && <p role="status" className="text-xs">Zadanie korekty zapisane. Sprawdź postęp i propozycję w planie.</p>}
    {decision && <p className="text-xs text-text-muted">Stan na {decision.localDate}. Zmiana wymaga zatwierdzenia.</p>}
    <Pressable variant="secondary" size="sm" onClick={openTraining}>Otwórz plan i cele</Pressable>
  </section>;
}
