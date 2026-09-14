/**
 * @component DashboardHistoriaTab
 * @role Zakładka KRONIKA — Pomiary, Sylwetka, Siłownia, Bieganie (Strava) i Eksport danych.
 * @usedBy Dashboard
 */
import { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { useSession } from '../../store/useStore';
import { Pressable } from '../ui/ControlPrimitives';
import Spinner from '../ui/Spinner';
import HorizonHeader from './HorizonHeader';
import Stats from './Stats';
import StravaWidget from '../integrations/StravaWidget';
import Photos from '../identity/Photos';

function ViewFallback() {
  return (
    <div className="flex min-h-[var(--ds-h-220px)] items-center justify-center rounded-lg border border-on-accent/[0.06] bg-on-accent/[0.02]">
      <Spinner size="md" />
    </div>
  );
}

const QUICK_ANCHORS = [
  { label: 'Pomiary', id: 'kronika-pomiary', icon: '📏' },
  { label: 'Sylwetka', id: 'kronika-sylwetka', icon: '📸' },
  { label: 'Siłownia', id: 'kronika-silownia', icon: '🏋️' },
  { label: 'Biegi', id: 'kronika-bieganie', icon: '🏃' },
  { label: 'Eksport', id: 'kronika-eksport', icon: '📦' },
];

export function DashboardHistoriaTab() {
  const session = useSession();
  if (!session) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="p-4 sm:p-5 pb-8 space-y-4">
      {/* Header */}
      <div>
        <HorizonHeader
          eyebrow="Uczę się"
          title="Kronika"
          icon={Sparkles}
          description="Kompletny dziennik transformacji ciała, siły, wydolności i telemetrii."
        />

        {/* Quick Anchor Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_ANCHORS.map((a) => (
            <Pressable
              key={a.id}
              onClick={() => scrollTo(a.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border-custom/80 bg-surface/70 hover:bg-surface hover:border-primary/40 text-3xs font-bold text-text-muted hover:text-text-primary transition-all active:scale-95 shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </Pressable>
          ))}
        </div>
      </div>

      <Suspense fallback={<ViewFallback />}>
        <Stats
          photosSlot={<Photos />}
          runningSlot={<StravaWidget session={session} />}
        />
      </Suspense>
    </div>
  );
}
