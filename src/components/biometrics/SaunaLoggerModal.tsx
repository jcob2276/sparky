import { useState } from 'react';
import { ChevronLeft, Flame, Minus, Plus, Settings } from 'lucide-react';
import Button from '../ui/Button';
import { ControlTextarea, Pressable } from '../ui/ControlPrimitives';
import { useHaptics } from '../../hooks/useHaptics';
import { notify } from '../../lib/notify';
import { saveSaunaSession } from '../../lib/health/workoutSauna';
import { useUserId } from '../../store/useStore';
import TrainingHubAppearanceSheet from './workout/TrainingHubAppearanceSheet';
import { useTreningAccent } from './workout/useTreningAccent';
import './workout/treningTheme.css';

const MINUTE_PRESETS = [10, 15, 20, 30];
const MAX_MINUTES = 180;
const MAX_CELSIUS = 130;

function Stepper({
  label,
  unit,
  value,
  step,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const round = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-custom bg-surface-1 text-text-primary active:scale-90 disabled:opacity-40';
  return (
    <div className="rounded-3xl border border-border-custom bg-surface p-4">
      <p className="text-center text-xs font-bold tracking-normal text-text-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <Pressable onClick={() => onChange(Math.max(1, value - step))} disabled={value <= 1} aria-label={`${label}: minus ${step}`} className={round}>
          <Minus size={18} />
        </Pressable>
        <p className="text-4xl font-semibold tabular-nums text-text-primary">
          {value}
          <span className="ml-1 text-base font-bold text-text-muted">{unit}</span>
        </p>
        <Pressable onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`${label}: plus ${step}`} className={round}>
          <Plus size={18} />
        </Pressable>
      </div>
    </div>
  );
}

export default function SaunaLoggerModal({ onBack, onSaved }: { onBack: () => void; onSaved?: () => void }) {
  const userId = useUserId();
  const haptics = useHaptics();
  const { accent, setAccent } = useTreningAccent();
  const [minutes, setMinutes] = useState(15);
  const [celsius, setCelsius] = useState(80);
  const [sessionRpe, setSessionRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  async function save() {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await saveSaunaSession(userId, { minutes, celsius, sessionRpe, notes });
      haptics.success();
      notify('Zapisano saunę', 'success');
      onSaved?.();
      onBack();
    } catch (err: unknown) {
      haptics.error();
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="trening-theme flex min-h-screen flex-col" data-tren-accent={accent}>
      <header className="trening-header sticky top-0 z-[var(--z-sticky)] flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" onClick={onBack} aria-label="Wróć" className="!h-11 !w-11 shrink-0 !rounded-full !px-0">
          <ChevronLeft size={22} />
        </Button>
        <h1 className="flex min-w-0 flex-1 items-center justify-center gap-2 text-lg font-semibold text-text-primary">
          <Flame size={18} className="text-warning" /> Sauna
        </h1>
        <Pressable onClick={() => setAppearanceOpen(true)} aria-label="Wygląd" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-primary">
          <Settings size={18} />
        </Pressable>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-3 pb-32 pt-3">
        <Stepper label="Czas" unit="min" value={minutes} step={5} max={MAX_MINUTES} onChange={setMinutes} />
        <div className="flex gap-2">
          {MINUTE_PRESETS.map((preset) => (
            <Pressable
              key={preset}
              onClick={() => setMinutes(preset)}
              aria-pressed={minutes === preset}
              className={`h-11 flex-1 rounded-full border text-sm font-bold ${
                minutes === preset ? 'border-primary bg-primary/15 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'
              }`}
            >
              {preset} min
            </Pressable>
          ))}
        </div>

        <Stepper label="Temperatura" unit="°C" value={celsius} step={5} max={MAX_CELSIUS} onChange={setCelsius} />

        <div className="rounded-3xl border border-border-custom bg-surface p-4">
          <p className="mb-2 text-xs font-bold tracking-normal text-text-muted">Jak ciężko? (1–10)</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                aria-pressed={sessionRpe === n}
                onClick={() => setSessionRpe(sessionRpe === n ? null : n)}
                className={`h-11 rounded-xl border text-sm font-bold ${
                  sessionRpe === n ? 'border-primary bg-primary/15 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'
                }`}
              >
                {n}
              </Pressable>
            ))}
          </div>
        </div>

        <ControlTextarea
          aria-label="Notatka"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notatka (np. po nogach, zimny prysznic po)"
          rows={3}
          className="w-full rounded-3xl border border-border-custom bg-surface p-4 text-sm text-text-primary placeholder:text-text-muted"
        />
      </main>

      <div className="trening-footer-bar fixed inset-x-0 bottom-0 z-[var(--z-modal)] border-t px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-md">
          <Button variant="primary" onClick={() => void save()} disabled={saving} className="w-full !h-14 !rounded-2xl !text-base !font-semibold">
            {saving ? 'Zapisuję…' : 'Zapisz saunę'}
          </Button>
        </div>
      </div>

      <TrainingHubAppearanceSheet open={appearanceOpen} accent={accent} onSelect={setAccent} onClose={() => setAppearanceOpen(false)} />
    </div>
  );
}
