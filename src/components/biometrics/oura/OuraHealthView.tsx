import { Activity, ArrowLeft, HeartPulse, Sparkles } from 'lucide-react';
import { OuraLongTermView } from './OuraLongTermView';
import { OuraTodayView } from './OuraTodayView';
import { OuraVitalsView } from './OuraVitalsView';
import type { OuraHealthHubData } from './types';
import { OuraSleepTab } from './OuraSleepTab';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import './ouraTheme.css';
import HealthspanExperienceContainer from '../healthspan/HealthspanExperienceContainer';

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
      <div className="oura-theme dark min-h-screen text-text-primary">
        <div className="sticky top-0 z-40 border-b border-white/5 bg-surface-1/90 px-4 py-3 backdrop-blur-xl">
          <Button
            className="!rounded-full"
            icon={<ArrowLeft size={19} />}
            onClick={onSleepClose}
            variant="ghost"
          >
            Sen
          </Button>
        </div>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
          <OuraSleepTab {...data} />
        </main>
      </div>
    );
  }

  return (
    <div className="oura-theme dark min-h-screen text-text-primary">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-4 sm:px-6">
        <IconButton
          label="Wróć"
          icon={<ArrowLeft size={22} />}
          onClick={onExit}
        />
        <p className="text-sm font-light tracking-wide text-text-secondary">Sparky</p>
        <span className="h-11 w-11" aria-hidden="true" />
      </header>
      <main
        data-testid="oura-content"
        className="mx-auto w-full max-w-3xl px-4 pb-32 pt-7 sm:px-6"
      >
        {isLoading ? (
          <div className="grid min-h-96 place-items-center text-sm text-text-muted">
            Synchronizuję pomiary zdrowia…
          </div>
        ) : (
          <>
            {activeSection === 'today' && <OuraTodayView data={data} onOpenSleep={onOpenSleep} />}
            {activeSection === 'vitals' && <OuraVitalsView data={data} onOpenSleep={onOpenSleep} />}
            {activeSection === 'health' && (
              <div className="space-y-8">
                <HealthspanExperienceContainer />
                <OuraLongTermView data={data} />
              </div>
            )}
          </>
        )}
      </main>

      <nav
        aria-label="Sekcje zdrowia"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-around rounded-full border border-white/10 bg-surface-1/90 p-2 shadow-2xl backdrop-blur-xl"
      >
        {NAV_ITEMS.map(({ icon: Icon, id, label }) => {
          const active = activeSection === id;
          return (
            <Button
              key={id}
              aria-label={label}
              aria-pressed={active}
              className={`!min-h-12 !min-w-20 !flex-col !gap-1 !rounded-full !px-3 !text-xs ${
                active ? '!bg-white/10 !text-white' : '!text-text-muted'
              }`}
              onClick={() => onSectionChange(id)}
              variant="ghost"
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
              <span>{label}</span>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
