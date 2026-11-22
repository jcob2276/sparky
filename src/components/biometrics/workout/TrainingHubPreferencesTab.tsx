import { useState } from 'react';
import { Clock, Play, Smartphone, Sliders, Vibrate, Volume2 } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { Switch } from '../../ui/Switch';
import {
  playTimerCompletionChime,
  readTreningPreferences,
  writeTreningPreferences,
  type TreningPreferences,
} from '../../../lib/health/treningPreferences';

const REST_OPTIONS = [
  { seconds: 60, label: '60s', hint: 'Krótka' },
  { seconds: 90, label: '90s', hint: 'Standard' },
  { seconds: 120, label: '120s', hint: 'Złożona' },
  { seconds: 180, label: '180s', hint: 'Siła' },
];

const SECTION_LABEL = 'block text-2xs font-bold tracking-wide text-text-muted';

type BooleanPref = 'timerSound' | 'timerVibration' | 'keepAwake' | 'plateCalculator';

/** Jeden wiersz ustawienia: ikona, tytuł z opisem i przełącznik (opcjonalnie z dodatkową akcją obok). */
function PrefRow({
  icon,
  title,
  hint,
  checked,
  onChange,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-custom bg-surface-1 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-bold leading-tight text-text-primary">{title}</p>
          <p className="mt-0.5 text-2xs leading-snug text-text-muted">{hint}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <Switch label="" aria-label={title} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </div>
    </div>
  );
}

/** Zakładka „Timer i asysta”: dźwięk, wibracje, domyślna przerwa, ekran i kalkulator talerzy. */
export default function TrainingHubPreferencesTab() {
  const [prefs, setPrefs] = useState<TreningPreferences>(() => readTreningPreferences());
  const [testedSound, setTestedSound] = useState(false);

  const update = <K extends keyof TreningPreferences>(key: K, value: TreningPreferences[K]) => {
    setPrefs(writeTreningPreferences({ [key]: value }));
  };
  const toggle = (key: BooleanPref) => (value: boolean) => update(key, value);

  const testChime = () => {
    playTimerCompletionChime();
    setTestedSound(true);
    window.setTimeout(() => setTestedSound(false), 1200);
  };

  return (
    <>
      <div className="space-y-3">
        <span className={SECTION_LABEL}>Dźwięki i wibracje</span>
        <PrefRow
          icon={<Volume2 size={18} />}
          title="Dźwięk po zakończeniu serii"
          hint="Subtelny gong informujący o końcu odliczania przerwy"
          checked={prefs.timerSound}
          onChange={toggle('timerSound')}
          extra={
            <Pressable
              type="button"
              onClick={testChime}
              title="Przetestuj dźwięk"
              className="flex items-center gap-1 rounded-lg border border-border-custom bg-surface-2 px-2 py-1 text-2xs font-semibold text-text-secondary hover:bg-surface-3"
            >
              <Play size={10} className={testedSound ? 'text-primary' : ''} />
              {testedSound ? 'Gra!' : 'Test'}
            </Pressable>
          }
        />
        <PrefRow
          icon={<Vibrate size={18} />}
          title="Wibracje haptyczne"
          hint="Krótki impuls haptyczny po odliczeniu odpoczynku"
          checked={prefs.timerVibration}
          onChange={toggle('timerVibration')}
        />
      </div>

      <div>
        <span className={`${SECTION_LABEL} mb-2 flex items-center gap-1.5`}>
          <Clock size={12} className="text-primary" />
          Domyślny czas odpoczynku po serii
        </span>
        <div className="grid grid-cols-4 gap-2">
          {REST_OPTIONS.map((option) => {
            const active = prefs.defaultRestSeconds === option.seconds;
            return (
              <Pressable
                key={option.seconds}
                type="button"
                onClick={() => update('defaultRestSeconds', option.seconds)}
                className={`flex flex-col items-center justify-center rounded-xl border px-1 py-2.5 text-center transition-all ${
                  active
                    ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm'
                    : 'border-border-custom bg-surface-1 text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-sm font-extrabold">{option.label}</span>
                <span className="mt-0.5 text-2xs opacity-80">{option.hint}</span>
              </Pressable>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <span className={SECTION_LABEL}>Ekran i asysta na siłowni</span>
        <PrefRow
          icon={<Smartphone size={18} />}
          title="Zawsze włączony ekran"
          hint="Zapobiega wygaszaniu ekranu telefonu podczas aktywnego treningu (Wake Lock)"
          checked={prefs.keepAwake}
          onChange={toggle('keepAwake')}
        />
        <PrefRow
          icon={<Sliders size={18} />}
          title="Kalkulator talerzy na gryf"
          hint="Szybka podpowiedź talerzy (20, 15, 10, 5, 2.5 kg) dla sztangi olimpijskiej"
          checked={prefs.plateCalculator}
          onChange={toggle('plateCalculator')}
        />
      </div>
    </>
  );
}
