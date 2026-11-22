import { useState } from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import { STORAGE_KEYS } from '../../../lib/constants';
import { Pressable } from '../../ui/ControlPrimitives';
import { TRENING_ACCENT_PRESETS, type TreningAccentId } from '../../../lib/health/treningAccent';

type ColorMode = 'light' | 'dark';

function applyColorMode(mode: ColorMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, mode);
  } catch {
    /* private mode */
  }
}

const MODES = [
  ['light', 'Jasny', Sun],
  ['dark', 'Ciemny', Moon],
] as const;

/** Zakładka „Wygląd i kolory”: motyw jasny/ciemny i paleta akcentu Centrum treningu. */
export default function TrainingHubAppearanceTab({
  accent,
  onSelect,
}: {
  accent: TreningAccentId;
  onSelect: (id: TreningAccentId) => void;
}) {
  const [mode, setMode] = useState<ColorMode>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));

  return (
    <>
      <div>
        <span className="mb-2 block text-2xs font-bold tracking-wide text-text-muted">Motyw interfejsu</span>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Motyw">
          {MODES.map(([id, label, Icon]) => (
            <Pressable
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                applyColorMode(id);
              }}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors ${
                mode === id
                  ? 'border-primary bg-primary/10 font-extrabold text-primary shadow-sm'
                  : 'border-border-custom bg-surface-1 text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={15} /> {label}
            </Pressable>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-2xs font-bold tracking-wide text-text-muted">
            Kolor akcentu ({TRENING_ACCENT_PRESETS.length} wariantów)
          </span>
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
                className={`ui-interactive relative rounded-2xl border px-3 py-2.5 text-left transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                    : 'border-border-custom bg-surface-1 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-sm dark:border-white/15"
                    style={{ background: preset.swatch }}
                    aria-hidden
                  />
                  <div className="min-w-0 pr-4">
                    <p className="truncate font-display text-xs font-bold text-text-primary">{preset.label}</p>
                    <p className="truncate text-2xs text-text-muted">{preset.hint}</p>
                  </div>
                </div>
                {selected && (
                  <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-accent">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </Pressable>
            );
          })}
        </div>
      </div>
    </>
  );
}
