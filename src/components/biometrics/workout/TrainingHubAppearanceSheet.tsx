import { useState } from 'react';
import {
  Check,
  Clock,
  Moon,
  Palette,
  Play,
  Sliders,
  Smartphone,
  Sun,
  Vibrate,
  Volume2,
  X,
} from 'lucide-react';
import { STORAGE_KEYS } from '../../../lib/constants';
import { Pressable } from '../../ui/ControlPrimitives';
import {
  TRENING_ACCENT_PRESETS,
  type TreningAccentId,
} from '../../../lib/health/treningAccent';
import {
  playTimerCompletionChime,
  readTreningPreferences,
  writeTreningPreferences,
  type TreningPreferences,
} from '../../../lib/health/treningPreferences';

interface Props {
  open: boolean;
  accent: TreningAccentId;
  onSelect: (id: TreningAccentId) => void;
  onClose: () => void;
}

function applyColorMode(mode: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, mode);
  } catch {
    /* private mode */
  }
}

const REST_OPTIONS = [
  { seconds: 60, label: '60s', hint: 'Krótka' },
  { seconds: 90, label: '90s', hint: 'Standard' },
  { seconds: 120, label: '120s', hint: 'Złożona' },
  { seconds: 180, label: '180s', hint: 'Siła' },
];

export default function TrainingHubAppearanceSheet({
  open,
  accent,
  onSelect,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'appearance' | 'preferences'>('appearance');
  const [mode, setMode] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [prefs, setPrefs] = useState<TreningPreferences>(() => readTreningPreferences());
  const [testedSound, setTestedSound] = useState(false);

  if (!open) return null;

  const updatePref = <K extends keyof TreningPreferences>(key: K, val: TreningPreferences[K]) => {
    const updated = writeTreningPreferences({ [key]: val });
    setPrefs(updated);
  };

  const handleTestChime = () => {
    playTimerCompletionChime();
    setTestedSound(true);
    window.setTimeout(() => setTestedSound(false), 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Ustawienia treningu"
    >
      <Pressable
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
        onClick={onClose}
        aria-label="Zamknij"
      />

      <div className="trening-theme relative w-full max-w-lg sm:mx-4 mb-0 sm:mb-0 max-h-[92vh] flex flex-col rounded-t-[1.75rem] sm:rounded-[1.5rem] border border-border-custom bg-surface shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="h-1.5 w-12 rounded-full bg-text-muted/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-2 pb-3 border-b border-border-custom/70">
          <div>
            <p className="text-2xs font-semibold tracking-wider uppercase text-primary">
              Personalizacja
            </p>
            <h2 className="text-base sm:text-lg font-bold text-text-primary font-display leading-tight mt-0.5">
              Ustawienia treningu
            </h2>
          </div>
          <Pressable
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:text-text-primary cursor-pointer active:scale-95 transition-transform"
            aria-label="Zamknij"
          >
            <X size={16} />
          </Pressable>
        </div>

        {/* Tab switch pills */}
        <div className="px-4 sm:px-6 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-xl border border-border-custom/60">
            <button
              type="button"
              onClick={() => setTab('appearance')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                tab === 'appearance'
                  ? 'bg-surface text-text-primary shadow-sm border border-border-custom/50'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Palette size={14} className={tab === 'appearance' ? 'text-primary' : ''} />
              Wygląd i kolory
            </button>
            <button
              type="button"
              onClick={() => setTab('preferences')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                tab === 'preferences'
                  ? 'bg-surface text-text-primary shadow-sm border border-border-custom/50'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sliders size={14} className={tab === 'preferences' ? 'text-primary' : ''} />
              Timer i asysta
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(85vh-140px)]">
          {tab === 'appearance' ? (
            <>
              {/* Dark / Light Mode */}
              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-text-muted mb-2 block">
                  Motyw interfejsu
                </label>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Motyw">
                  {([['light', 'Jasny', Sun], ['dark', 'Ciemny', Moon]] as const).map(
                    ([id, label, Icon]) => (
                      <Pressable
                        key={id}
                        type="button"
                        aria-pressed={mode === id}
                        onClick={() => {
                          setMode(id);
                          applyColorMode(id);
                        }}
                        className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold cursor-pointer transition-colors ${
                          mode === id
                            ? 'border-primary bg-primary/10 text-primary font-extrabold shadow-sm'
                            : 'border-border-custom bg-surface-1 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <Icon size={15} /> {label}
                      </Pressable>
                    )
                  )}
                </div>
              </div>

              {/* Accent Color Palette (8 presets) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-2xs font-bold uppercase tracking-wider text-text-muted">
                    Kolor akcentu ({TRENING_ACCENT_PRESETS.length} wariantów)
                  </label>
                  <span className="text-2xs text-text-muted">Dotyczy Centrum i loggera</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {TRENING_ACCENT_PRESETS.map((preset) => {
                    const selected = accent === preset.id;
                    return (
                      <Pressable
                        key={preset.id}
                        type="button"
                        onClick={() => onSelect(preset.id)}
                        className={`relative rounded-2xl border px-3 py-2.5 text-left ui-interactive cursor-pointer transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm'
                            : 'border-border-custom bg-surface-1 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-8 w-8 shrink-0 rounded-full border border-black/10 dark:border-white/15 shadow-sm"
                            style={{ background: preset.swatch }}
                            aria-hidden
                          />
                          <div className="min-w-0 pr-4">
                            <p className="text-xs font-bold text-text-primary font-display truncate">
                              {preset.label}
                            </p>
                            <p className="text-2xs text-text-muted truncate">{preset.hint}</p>
                          </div>
                        </div>
                        {selected && (
                          <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-accent">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </Pressable>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preferences: Timer & Sounds */}
              <div className="space-y-3">
                <label className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                  Dźwięki i wibracje
                </label>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border-custom bg-surface-1 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary leading-tight">
                        Dźwięk po zakończeniu serii
                      </p>
                      <p className="text-2xs text-text-muted mt-0.5 leading-snug">
                        Subtelny gong informujący o końcu odliczania przerwy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="px-2 py-1 text-2xs font-semibold rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary border border-border-custom flex items-center gap-1 active:scale-95 transition-transform"
                      title="Przetestuj dźwięk"
                    >
                      <Play size={10} className={testedSound ? 'text-primary' : ''} />
                      {testedSound ? 'Gra!' : 'Test'}
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.timerSound}
                        onChange={(e) => updatePref('timerSound', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Vibration Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border-custom bg-surface-1 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Vibrate size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary leading-tight">
                        Wibracje haptyczne
                      </p>
                      <p className="text-2xs text-text-muted mt-0.5 leading-snug">
                        Krótki impuls haptyczny po odliczeniu odpoczynku
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.timerVibration}
                      onChange={(e) => updatePref('timerVibration', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* Default Rest Duration */}
              <div>
                <label className="text-2xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <Clock size={12} className="text-primary" />
                  Domyślny czas odpoczynku po serii
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {REST_OPTIONS.map((opt) => {
                    const active = prefs.defaultRestSeconds === opt.seconds;
                    return (
                      <button
                        key={opt.seconds}
                        type="button"
                        onClick={() => updatePref('defaultRestSeconds', opt.seconds)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                            : 'border-border-custom bg-surface-1 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{opt.label}</span>
                        <span className="text-3xs opacity-80 mt-0.5">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gym Experience & Screen */}
              <div className="space-y-3">
                <label className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                  Ekran i asysta na siłowni
                </label>

                {/* Keep Screen Awake */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border-custom bg-surface-1 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary leading-tight">
                        Zawsze włączony ekran
                      </p>
                      <p className="text-2xs text-text-muted mt-0.5 leading-snug">
                        Zapobiega wygaszaniu ekranu telefonu podczas aktywnego treningu (Wake Lock)
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.keepAwake}
                      onChange={(e) => updatePref('keepAwake', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Plate Calculator */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-border-custom bg-surface-1 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sliders size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary leading-tight">
                        Kalkulator talerzy na gryf
                      </p>
                      <p className="text-2xs text-text-muted mt-0.5 leading-snug">
                        Szybka podpowiedź talerzy (20, 15, 10, 5, 2.5 kg) dla sztangi olimpijskiej
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={prefs.plateCalculator}
                      onChange={(e) => updatePref('plateCalculator', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 border-t border-border-custom/50">
          <Pressable
            type="button"
            onClick={onClose}
            className="w-full trening-hero-cta py-3 text-sm font-bold ui-interactive cursor-pointer"
          >
            Gotowe
          </Pressable>
        </div>
      </div>
    </div>
  );
}
