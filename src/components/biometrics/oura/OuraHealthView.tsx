import { Activity, ArrowLeft, HeartPulse, Sparkles } from 'lucide-react';
import { OuraLongTermView } from './OuraLongTermView';
import { OuraTodayView } from './OuraTodayView';
import { OuraVitalsView } from './OuraVitalsView';
import type { OuraHealthHubData } from './types';
import { OuraSleepTab } from './OuraSleepTab';

export type OuraSection = 'today' | 'vitals' | 'health';

interface OuraHealthViewProps {
  activeSection: OuraSection;
  data: OuraHealthHubData;
  isLoading?: boolean;
  onExit?: () => void;
  onOpenSleep: () => void;
  onSectionChange: (section: OuraSection) => void;
  onSleepClose?: () => void;
  sleepOpen?: boolean;
}

const NAV_ITEMS = [
  { id: 'today' as const, label: 'Dzisiaj', icon: Sparkles },
  { id: 'vitals' as const, label: 'Parametry', icon: Activity },
  { id: 'health' as const, label: 'Moje zdrowie', icon: HeartPulse },
];

export function OuraHealthView({
  activeSection,
  data,
  isLoading = false,
  onExit,
  onOpenSleep,
  onSectionChange,
  onSleepClose,
  sleepOpen = false,
}: OuraHealthViewProps) {
  if (sleepOpen) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
          <button
            className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-slate-300 active:scale-[0.97]"
            onClick={onSleepClose}
            type="button"
          >
            <ArrowLeft size={19} /> Sen
          </button>
        </div>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
          <OuraSleepTab {...data} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-4 sm:px-6">
        <button
          aria-label="Wróć"
          className="grid h-11 w-11 place-items-center rounded-full text-slate-300 active:scale-[0.97]"
          onClick={onExit}
          type="button"
        >
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm font-medium text-slate-300">Sparky Health</p>
        <span className="h-11 w-11" aria-hidden="true" />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 sm:pb-12">
        {isLoading ? (
          <div className="grid min-h-96 place-items-center text-sm text-slate-500">
            Synchronizuję pomiary zdrowia…
          </div>
        ) : (
          <>
            {activeSection === 'today' && <OuraTodayView data={data} onOpenSleep={onOpenSleep} />}
            {activeSection === 'vitals' && <OuraVitalsView data={data} onOpenSleep={onOpenSleep} />}
            {activeSection === 'health' && <OuraLongTermView data={data} />}
          </>
        )}
      </main>

      <nav
        aria-label="Sekcje zdrowia"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-around rounded-full border border-white/10 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl sm:sticky sm:bottom-auto sm:top-4 sm:mb-4 sm:mt-4"
      >
        {NAV_ITEMS.map(({ icon: Icon, id, label }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              aria-label={label}
              aria-pressed={active}
              className={`flex min-h-12 min-w-20 flex-col items-center justify-center gap-1 rounded-full px-3 text-xs transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-slate-500'
              }`}
              onClick={() => onSectionChange(id)}
              type="button"
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
