import { useState } from 'react';
import { Palette, Sliders, X } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import Tabs from '../../ui/Tabs';
import type { TreningAccentId } from '../../../lib/health/treningAccent';
import TrainingHubAppearanceTab from './TrainingHubAppearanceTab';
import TrainingHubPreferencesTab from './TrainingHubPreferencesTab';

interface Props {
  open: boolean;
  accent: TreningAccentId;
  onSelect: (id: TreningAccentId) => void;
  onClose: () => void;
}

type SheetTab = 'appearance' | 'preferences';

const TABS = [
  { key: 'appearance', label: 'Wygląd i kolory', icon: <Palette size={14} /> },
  { key: 'preferences', label: 'Timer i asysta', icon: <Sliders size={14} /> },
];

export default function TrainingHubAppearanceSheet({ open, accent, onSelect, onClose }: Props) {
  const [tab, setTab] = useState<SheetTab>('appearance');

  if (!open) return null;

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
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="h-1.5 w-12 rounded-full bg-text-muted/30" />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 pt-2 pb-3 border-b border-border-custom/70">
          <div>
            <p className="text-2xs font-semibold tracking-wide text-primary">Personalizacja</p>
            <h2 className="mt-0.5 font-display text-base font-bold leading-tight text-text-primary sm:text-lg">
              Ustawienia treningu
            </h2>
          </div>
          <Pressable
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-text-secondary transition-transform hover:text-text-primary active:scale-95"
            aria-label="Zamknij"
          >
            <X size={16} />
          </Pressable>
        </div>

        <div className="px-4 pb-1 pt-3 sm:px-6">
          <Tabs tabs={TABS} active={tab} onChange={(key) => setTab(key as SheetTab)} />
        </div>

        <div className="max-h-[calc(85vh-140px)] space-y-4 overflow-y-auto p-4 sm:p-6">
          {tab === 'appearance' ? <TrainingHubAppearanceTab accent={accent} onSelect={onSelect} /> : <TrainingHubPreferencesTab />}
        </div>
      </div>
    </div>
  );
}
