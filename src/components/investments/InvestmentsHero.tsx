import { useState } from 'react';
import { Activity, Eye, GitMerge, Landmark, type LucideIcon } from 'lucide-react';
import type { DashboardData } from '../../lib/investments/dashboardService';
import { Pressable } from '../ui/ControlPrimitives';

type Segment = 'all' | 'politicians' | 'insiders' | 'funds' | 'shorts';

const SEGMENTS: Array<{ key: Segment; label: string; caption: string }> = [
  { key: 'all', label: 'Wszystko', caption: 'Zgłoszeń w 14 dni' },
  { key: 'politicians', label: 'Kongres', caption: 'Ujawnień Kongresu' },
  { key: 'insiders', label: 'Insiderzy', caption: 'Zgłoszeń Form 4' },
  { key: 'funds', label: 'Fundusze 13F', caption: 'Raportów funduszy' },
  { key: 'shorts', label: 'Short GPW', caption: 'Pozycji krótkich' },
];

interface QuickAction { icon: LucideIcon; label: string; tab: string }

const ACTIONS: QuickAction[] = [
  { icon: Activity, label: 'Na żywo', tab: 'live' },
  { icon: Eye, label: 'Watchlista', tab: 'watchlist' },
  { icon: GitMerge, label: 'Zbieżność', tab: 'convergence' },
  { icon: Landmark, label: 'Kongres', tab: 'politicians' },
];

interface InvestmentsHeroProps {
  activity: DashboardData['activity14d'];
  onNavigateTab: (tab: string) => void;
}

function valueFor(activity: DashboardData['activity14d'], segment: Segment): number | null {
  return segment === 'all' ? activity.total : activity.sources[segment];
}

/** Hero w języku Finansów: segmenty, duża liczba, szybkie akcje w kółkach. */
export function InvestmentsHero({ activity, onNavigateTab }: InvestmentsHeroProps) {
  const [segment, setSegment] = useState<Segment>('all');
  const current = SEGMENTS.find((item) => item.key === segment) ?? SEGMENTS[0];
  const value = valueFor(activity, segment);
  const peak = activity.peakDateLabel ? `szczyt ${activity.peakDateLabel}` : 'brak zdarzeń w oknie';

  return (
    <section className="space-y-6 text-center" aria-label={current.caption}>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:justify-center" role="group" aria-label="Źródło danych">
        {SEGMENTS.map((item) => (
          <Pressable
            key={item.key}
            type="button"
            onClick={() => setSegment(item.key)}
            aria-pressed={segment === item.key}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--motion-fast)] ${segment === item.key ? 'bg-text-primary text-background' : 'bg-surface-1 text-text-secondary'}`}
          >
            {item.label}
          </Pressable>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm text-text-secondary">{current.caption}</p>
        <p className="ui-num text-[length:var(--finance-display-size)] font-semibold leading-[var(--line-height-display)] tracking-[var(--tracking-display)]">
          {value === null ? '—' : value.toLocaleString('pl-PL')}
        </p>
        <p className="min-h-5 text-sm font-medium text-text-muted">{peak}</p>
      </div>

      <div className="mx-auto flex max-w-sm justify-between px-1">
        {ACTIONS.map(({ icon: Icon, label, tab }) => (
          <Pressable key={tab} type="button" onClick={() => onNavigateTab(tab)} className="group flex w-16 flex-col items-center gap-2 text-xs font-semibold text-text-primary">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-1 ring-1 ring-text-primary/10 transition-transform duration-[var(--motion-instant)] group-active:scale-[var(--scale-pressed-strong)]">
              <Icon size={22} aria-hidden="true" />
            </span>
            {label}
          </Pressable>
        ))}
      </div>
    </section>
  );
}
