/**
 * @file PersonalBestsCard.tsx
 * @role Karta Sali Rekordów Życiowych (PR Trophy Room / Personal Bests) w stylu Bevel Health.
 * Prezentuje życiowe osiągnięcia biegowe, rekordy 1RM w bojach siłowych oraz rekordowe wskaźniki biometryczne.
 */

import { useState } from 'react';
import { Trophy, Flame, Award, Dumbbell, Activity, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';
import { type PersonalBestsSummary } from '@vanguard/domain';

interface PersonalBestsCardProps {
  summary: PersonalBestsSummary;
}

type TabKey = 'running' | 'strength' | 'biometrics';

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function RunningPbGrid({ items }: { items: PersonalBestsSummary['running'] }) {
  if (items.length === 0) {
    return (
      <p className="col-span-2 py-4 text-center text-xs text-text-muted">
        Brak zarejestrowanych rekordów biegowych.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((r) => (
        <div
          key={r.distanceLabel}
          className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3"
        >
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            {r.distanceLabel}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold tracking-tight">
              {formatSeconds(r.timeSeconds)}
            </span>
            <span className="text-3xs text-text-muted">({r.paceStr})</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-3xs text-text-secondary">
            <Calendar size={10} />
            <span>{r.achievedAt}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StrengthPbGrid({ items }: { items: PersonalBestsSummary['strength'] }) {
  if (items.length === 0) {
    return (
      <p className="col-span-2 py-4 text-center text-xs text-text-muted">
        Brak zarejestrowanych rekordów siłowych.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((s) => (
        <div
          key={s.liftKey}
          className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3"
        >
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            {s.liftName}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold tracking-tight">{s.weightKg} kg</span>
            <span className="text-3xs text-text-muted">x {s.reps} powt.</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-3xs text-text-secondary">
            <Dumbbell size={10} />
            <span>
              e1RM: {s.estimated1RM} kg · {s.achievedAt}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BiometricsPbGrid({ items }: { items: PersonalBestsSummary['biometrics'] }) {
  if (items.length === 0) {
    return (
      <p className="col-span-2 py-4 text-center text-xs text-text-muted">
        Brak zarejestrowanych rekordów biometrycznych.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((b) => (
        <div
          key={b.metricKey}
          className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3"
        >
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            {b.label}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold tracking-tight text-primary">{b.value}</span>
            <span className="text-xs font-bold text-text-muted">{b.unit}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-3xs text-text-secondary">
            <Activity size={10} />
            <span>{b.achievedAt}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PersonalBestsCard({ summary }: PersonalBestsCardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('running');

  const running = summary?.running ?? [];
  const strength = summary?.strength ?? [];
  const biometrics = summary?.biometrics ?? [];
  const totalCount = summary?.totalRecordsCount ?? (running.length + strength.length + biometrics.length);

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Trophy size={16} className="text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Sala Rekordów (PRs)</h3>
            <p className="text-3xs text-text-muted">Najwyższe historyczne osiągnięcia</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
          <Award size={10} /> {totalCount} rekordów
        </span>
      </div>

      {/* Banner ostatniego rekordu */}
      {summary?.recentRecord && (
        <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          <div className="flex items-center gap-2">
            <Flame size={14} className="shrink-0 text-warning" />
            <span className="font-semibold text-2xs">
              Ostatni PR: {summary.recentRecord.title}
            </span>
          </div>
          <span className="text-3xs text-text-muted">{summary.recentRecord.achievedAt}</span>
        </div>
      )}

      {/* Zakładki */}
      <div className="flex items-center gap-1.5 border-b border-border-custom/40 pb-2">
        <Button
          variant={activeTab === 'running' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('running')}
          className="!h-7 !px-2.5 !text-3xs"
        >
          Bieganie ({running.length})
        </Button>
        <Button
          variant={activeTab === 'strength' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('strength')}
          className="!h-7 !px-2.5 !text-3xs"
        >
          Siła ({strength.length})
        </Button>
        <Button
          variant={activeTab === 'biometrics' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('biometrics')}
          className="!h-7 !px-2.5 !text-3xs"
        >
          Biometria ({biometrics.length})
        </Button>
      </div>

      {/* Treść zakładki */}
      <div>
        {activeTab === 'running' && <RunningPbGrid items={running} />}
        {activeTab === 'strength' && <StrengthPbGrid items={strength} />}
        {activeTab === 'biometrics' && <BiometricsPbGrid items={biometrics} />}
      </div>
    </Card>
  );
}
