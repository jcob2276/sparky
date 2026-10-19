import { useState } from 'react';
import { Check, Moon, Sun, X } from 'lucide-react';
import { STORAGE_KEYS } from '../../../lib/constants';
import { Pressable } from '../../ui/ControlPrimitives';
import {
  TRENING_ACCENT_PRESETS,
  type TreningAccentId,
} from '../../../lib/health/treningAccent';

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

/** iOS-style appearance sheet — accent presets for .trening-theme only. */
export default function TrainingHubAppearanceSheet({
  open,
  accent,
  onSelect,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Wygląd treningu"
    >
      <Pressable
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-pointer"
        onClick={onClose}
        aria-label="Zamknij"
      />

      <div className="trening-theme relative w-full max-w-md sm:mx-4 mb-0 sm:mb-0 rounded-t-[1.75rem] sm:rounded-[1.5rem] border border-border-custom bg-surface shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-text-muted/35" />
        </div>

        <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-border-custom/70">
          <div>
            <p className="text-3xs font-black uppercase tracking-widest text-primary">Wygląd</p>
            <h2 className="text-base font-black text-text-primary font-display leading-tight mt-0.5">
              Kolor akcentu
            </h2>
          </div>
          <Pressable
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:text-text-primary cursor-pointer"
            aria-label="Zamknij"
          >
            <X size={16} />
          </Pressable>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Motyw">
            {([['light', 'Jasny', Sun], ['dark', 'Ciemny', Moon]] as const).map(([id, label, Icon]) => (
              <Pressable
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => { setMode(id); applyColorMode(id); }}
                className={`flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold cursor-pointer ${
                  mode === id ? 'border-primary bg-primary/10 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'
                }`}
              >
                <Icon size={15} /> {label}
              </Pressable>
            ))}
          </div>
          <p className="text-xs text-text-secondary leading-snug">
            Kolor akcentu dotyczy tylko Centrum Treningowego i loggera.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {TRENING_ACCENT_PRESETS.map((preset) => {
              const selected = accent === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  type="button"
                  onClick={() => onSelect(preset.id)}
                  className={`relative rounded-[1.15rem] border px-3 py-3 text-left ui-interactive cursor-pointer transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_rgb(var(--tren-accent-rgb)/35%)]'
                      : 'border-border-custom bg-surface-1 hover:border-primary/35'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-9 w-9 shrink-0 rounded-full border border-white/15 shadow-inner"
                      style={{ background: preset.swatch }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary font-display truncate">
                        {preset.label}
                      </p>
                      <p className="text-3xs text-text-muted truncate">{preset.hint}</p>
                    </div>
                  </div>
                  {selected && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-accent">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </Pressable>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          <Pressable
            type="button"
            onClick={onClose}
            className="w-full trening-hero-cta py-3 text-sm ui-interactive cursor-pointer"
          >
            Gotowe
          </Pressable>
        </div>
      </div>
    </div>
  );
}
