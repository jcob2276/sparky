/**
 * @component FitnessScorePanel
 * @role Panel fitness score (composite z body/oura/nutrition/sessions/strava/habits).
 * @composes FitnessRadarChart, fitnessScoreUtils (computeFitnessProfile, wraps fitnessScoreHelpers)
 * @usedBy DesktopDashboard
 */
import { useMemo } from 'react';
import { Panel } from '../shell/Panel';
import { getTodayWarsaw } from '../../../lib/date';
import { type BodyRow } from '@vanguard/domain';
import { Activity } from 'lucide-react';
import { computeFitnessProfile } from './fitnessScoreUtils';
import FitnessRadarChart from './FitnessRadarChart';
import { Card } from '../../ui/Card';
import type { OuraRow, NutritionDayRow } from '../desktopUtils';
import type { DesktopSessionRow, StravaActivityRow, HabitRow, HabitLogRow } from '../shell/useDesktopData';

interface FitnessScorePanelProps {
  oura: OuraRow[];
  nutrition: NutritionDayRow[];
  sessions: DesktopSessionRow[];
  strava: StravaActivityRow[];
  habits: HabitRow[];
  habitLogs: HabitLogRow[];
  volData: { week: string; vol: number }[];
  body: BodyRow[];
  heightCm: number | null;
  theme: string;
  grid: string;
  personalTargets: { proteinFloorG: number; targetKcal: number | null; sleepTargetH: number } | null;
}

export default function FitnessScorePanel({
  oura, nutrition, sessions, strava, habits, habitLogs,
  volData, body, heightCm, theme, grid, personalTargets,
}: FitnessScorePanelProps) {
  const today = getTodayWarsaw();
  const profile = useMemo(
    () => computeFitnessProfile({
      oura, nutrition, sessions, strava, habits, habitLogs, volData, body, heightCm, today,
      proteinTargetG: personalTargets?.proteinFloorG ?? undefined,
      sleepTargetH: personalTargets?.sleepTargetH ?? undefined,
    }),
    [oura, nutrition, sessions, strava, habits, habitLogs, volData, body, heightCm, today, personalTargets],
  );

  return (
    <Panel title="Hybrydowy Profil & Fitness Score" className="h-full flex flex-col">
      <div className="grid grid-cols-1 xl:grid-cols-[var(--ds-arbitrary-minmax-0-1fr-minmax-0-1-15fr)] gap-6 items-center flex-1">
        <div className="flex flex-col items-center justify-center py-4 xl:py-8 xl:min-h-[var(--ds-h-280px)] border-b xl:border-b-0 xl:border-r border-border-custom">
          <div className="flex items-center gap-1.5 mb-3 text-primary">
            <Activity size={16} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-text-secondary">
              Hybrydowy profil
            </span>
          </div>
          <div className="flex items-stretch gap-6">
            <div className="flex flex-col items-center">
              <p className="text-6xl xl:text-6xl font-black italic tracking-tighter leading-none text-primary font-display">
                {profile.capabilityScore}
              </p>
              <p className="text-2xs font-bold text-text-muted mt-2 uppercase tracking-widest text-center">
                Capability /100
              </p>
            </div>
            <div className="w-px bg-border-custom" />
            <div className="flex flex-col items-center">
              <p className="text-6xl xl:text-6xl font-black italic tracking-tighter leading-none text-text-primary font-display">
                {profile.processScore}
              </p>
              <p className="text-2xs font-bold text-text-muted mt-2 uppercase tracking-widest text-center">
                Process /100
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg bg-surface-2/40 border border-border-custom/50 text-2xs text-text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
            <span>Capability: siła & tlen</span>
            <span className="text-border-custom">|</span>
            <span className="inline-block w-2 h-2 rounded-full bg-text-muted shrink-0" />
            <span>Process: dyscyplina & regeneracja</span>
          </div>
        </div>

        <FitnessRadarChart profile={profile} theme={theme} grid={grid} />
      </div>

      <div className="mt-5 pt-5 border-t border-border-custom">
        <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-22em)] text-text-muted mb-3">
          Rozbicie filarów formy
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.breakdowns.map((item) => (
            <Card
              key={item.key}
              variant="outline"
              padding="0.75rem 0.875rem"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-xs font-black text-text-primary">{item.label}</span>
                <span
                  className={`text-sm font-black italic font-display shrink-0 ${
                    item.group === 'capability' ? 'text-primary' : 'text-text-secondary'
                  }`}
                >
                  {item.score.toFixed(1)}/10
                </span>
              </div>
              <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${item.group === 'capability' ? 'bg-primary' : 'bg-text-secondary'}`}
                  style={{ width: `${Math.min(100, Math.max(5, item.score * 10))}%` }}
                />
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">{item.detail}</p>
            </Card>
          ))}
        </div>
        <details className="mt-3 group">
          <summary className="text-2xs text-text-muted cursor-pointer hover:text-text-primary transition-colors flex items-center gap-1.5">
            <span>ℹ️ Metodyka wyliczeń (Capability vs Process)</span>
          </summary>
          <p className="mt-2 text-2xs text-text-muted leading-relaxed pl-3 border-l border-border-custom">
            Capability (niebieskie) = Siła + Wydolność (realne możliwości atletyczne, 1RM / masa ciała, Cooper). Process (szare) = Regularność + Regeneracja + Adaptacja + Obciążenie (nawyki, tonaż, sen, HRV). Osobna punktacja zapobiega maskowaniu zaniedbań regeneracji przez samą siłę.
          </p>
        </details>
      </div>
    </Panel>
  );
}
