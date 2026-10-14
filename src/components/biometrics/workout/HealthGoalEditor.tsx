import { ControlInput, ControlSelect, ControlTextarea, Pressable } from '../../ui/ControlPrimitives';
import type { HealthGoal, TrainingConstraints } from '../../../lib/health/healthGoals';

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const OPTIONS: Record<string, { variants: string[]; standards: string[] }> = {
  run_10k: { variants: ['road', 'track', 'treadmill'], standards: ['elapsed_time'] },
  body_fat: { variants: ['dexa', 'bia', 'skinfold', 'tape'], standards: ['same_method'] },
  pull_up: { variants: ['pronated', 'neutral', 'supinated'], standards: ['strict_full_rom'] },
  muscle_up: { variants: ['bar', 'rings'], standards: ['strict_full_rom', 'controlled_kipping'] },
  bench: { variants: ['barbell', 'paused_barbell'], standards: ['full_rom', 'paused_full_rom'] },
  posture: { variants: ['user'], standards: ['comfortable_upright'] },
};
const LABELS: Record<string, string> = { road: 'Ulica', track: 'Bieżnia stadionowa', treadmill: 'Bieżnia mechaniczna',
  elapsed_time: 'Czas całkowity na 10 km', dexa: 'DXA', bia: 'BIA', skinfold: 'Fałdomierz', tape: 'Obwody', same_method: 'Porównanie tą samą metodą',
  pronated: 'Nachwyt', neutral: 'Chwyt neutralny', supinated: 'Podchwyt', strict_full_rom: 'Ściśle, pełny zakres ruchu',
  bar: 'Drążek', rings: 'Kółka', controlled_kipping: 'Kontrolowane, z zamachem', barbell: 'Sztanga', paused_barbell: 'Sztanga z pauzą',
  full_rom: 'Pełny zakres ruchu', paused_full_rom: 'Pełny zakres z pauzą', user: 'Moja ocena', comfortable_upright: 'Swobodnie wyprostowany, z komfortem' };
interface Props {
  goals: HealthGoal[]; constraints: TrainingConstraints; saving: boolean; error: string | null; profileBodyFat: number | null;
  changeGoal: (index: number, goal: HealthGoal) => void; changeConstraints: (constraints: TrainingConstraints) => void; save: () => void;
}
export default function HealthGoalEditor({ goals, constraints, saving, error, profileBodyFat, changeGoal, changeConstraints, save }: Props) {
  const bf = goals.find(goal => goal.spec.kind === 'body_fat');
  return <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-4" aria-label="Cele treningowe">
    <h2 className="font-bold text-text-primary">Efekt końcowy i warunki treningu</h2>
    <p className="text-xs text-text-secondary">Wybierz kryteria, według których będziemy oceniać postęp. Brak standardu pozostaje widoczny w planie.</p>
    {profileBodyFat != null && bf?.target !== profileBodyFat && <p className="text-xs text-warning">Profil żywienia ma cel {profileBodyFat}% BF. Zapis zmieni go na {bf?.target}%.</p>}
    {goals.map((goal, index) => <fieldset key={goal.id ?? goal.spec.kind} className="space-y-2 border-b border-border-custom pb-3">
      <legend className="text-sm font-semibold">{goal.name}</legend>
      <label className="block text-xs">Cel ({goal.unit === 'seconds' ? 'minuty' : goal.unit})
        <ControlInput type="number" min="0.1" step="0.1" value={goal.unit === 'seconds' ? goal.target / 60 : goal.target}
          onChange={e => changeGoal(index, { ...goal, target: Number(e.target.value) * (goal.unit === 'seconds' ? 60 : 1) })} className="w-full p-2 rounded-lg bg-surface-2" />
      </label>
      {(['variant', 'standard'] as const).map(field => <label className="block text-xs" key={field}>{field === 'variant' ? 'Wariant / metoda' : 'Kryterium wykonania'}
        <ControlSelect value={goal.spec[field] ?? ''} onChange={e => changeGoal(index, { ...goal, spec: { ...goal.spec, [field]: e.target.value || null } })} className="w-full p-2 rounded-lg bg-surface-2">
          <option value="">Jeszcze nie ustalone</option>
          {OPTIONS[goal.spec.kind][field === 'variant' ? 'variants' : 'standards'].map(value => <option key={value} value={value}>{LABELS[value]}</option>)}
        </ControlSelect>
      </label>)}
      <label className="block text-xs">Priorytet
        <ControlSelect value={goal.spec.priority} onChange={e => changeGoal(index, { ...goal, spec: { ...goal.spec, priority: Number(e.target.value) } })} className="w-full p-2 rounded-lg bg-surface-2">
          <option value={1}>Ważny</option><option value={2}>Bardzo ważny</option><option value={3}>Główny cel bloku</option>
        </ControlSelect>
      </label>
      {goal.spec.kind === 'bench' && <label className="block text-xs">Co znaczy „z zapasem” (RIR)?
        <ControlInput type="number" min={0} max={5} value={goal.spec.reserveReps ?? ''} placeholder="Liczba powtórzeń w zapasie"
          onChange={e => changeGoal(index, { ...goal, spec: { ...goal.spec, reserveReps: e.target.value === '' ? null : Number(e.target.value) } })} className="w-full p-2 rounded-lg bg-surface-2" />
      </label>}
    </fieldset>)}
    <fieldset className="space-y-2"><legend className="text-sm font-semibold">Dostępne dni i czas na całą sesję</legend>
      {DAYS.map((day, index) => {
        const slot = constraints.availability.find(item => item.day === index + 1);
        return <div key={day} className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><ControlInput type="checkbox" checked={Boolean(slot)} onChange={e => changeConstraints({ ...constraints,
            availability: e.target.checked ? [...constraints.availability, { day: index + 1, minutes: 60 }] : constraints.availability.filter(item => item.day !== index + 1) })} />{day}</label>
          {slot && <label className="text-xs">Minuty <ControlInput type="number" min={10} max={240} value={slot.minutes} onChange={e => changeConstraints({ ...constraints,
            availability: constraints.availability.map(item => item.day === slot.day ? { ...item, minutes: Number(e.target.value) } : item) })} className="p-2 rounded-lg bg-surface-2 w-20" /></label>}
        </div>;
      })}
    </fieldset>
    <label className="block text-xs">Dostępny sprzęt (oddziel przecinkami)
      <ControlInput value={constraints.equipment.join(', ')} placeholder="np. sztanga, ławka, drążek, hantle"
        onChange={e => changeConstraints({ ...constraints, equipment: e.target.value.split(',').map(item => item.trim()) })} className="w-full p-2 rounded-lg bg-surface-2" />
    </label>
    <label className="block text-xs">Ograniczenia, ból, ruchy do pominięcia (jedno w wierszu)
      <ControlTextarea value={constraints.limitations.join('\n')} rows={3} onChange={e => changeConstraints({ ...constraints, limitations: e.target.value.split('\n') })} className="w-full p-2 rounded-lg bg-surface-2" />
    </label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Pressable variant="primary" onClick={save} disabled={saving}>{saving ? 'Zapisywanie…' : 'Potwierdź cele i warunki'}</Pressable>
  </section>;
}
