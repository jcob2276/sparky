import React from 'react';
import { Panel } from '../../shell/Panel';
import { Card } from '../../../ui/Card';
import type { OracleRecommendation } from '../../../../lib/recommendationsApi';
import {
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getTodayWarsaw } from '../../../../lib/date';
import Button from '../../../ui/Button';

import { HistoryTimelineItem, MetricGroupHeader, OracleStats } from './GeneralRecommendationsHistory';
import { getMetaMeta } from './recommendationConfig';

interface GeneralRecommendationsPanelProps {
  recommendations: OracleRecommendation[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getDaysRemaining(createdAt: string, windowDays: number, todayStr: string) {
  const createdDate = new Date(createdAt.slice(0, 10) + 'T12:00:00Z');
  const endDate = new Date(createdDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const today = new Date(todayStr + 'T12:00:00Z');
  const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000);
  return Math.max(0, diffDays);
}

function getTimeProgress(createdAt: string, windowDays: number, todayStr: string): number {
  const start = new Date(createdAt.slice(0, 10) + 'T12:00:00Z').getTime();
  const end = start + windowDays * 86_400_000;
  const now = new Date(todayStr + 'T12:00:00Z').getTime();
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

// ─── PENDING CARD ─────────────────────────────────────────────────────────────

function RecommendationPendingCard({ rec, todayStr }: { rec: OracleRecommendation; todayStr: string }) {
  const daysLeft = getDaysRemaining(rec.created_at, rec.evaluation_window_days, todayStr);
  const progress = getTimeProgress(rec.created_at, rec.evaluation_window_days, todayStr);
  const isExpiring = daysLeft <= 2;

  return (
    <Card padding="0.75rem" className="hover:border-primary/20 hover:shadow-sm transition-all duration-[var(--motion-medium)] space-y-2">
      <p className="text-xs font-semibold text-text-primary leading-relaxed">{rec.recommendation_text}</p>
      <div className="space-y-1.5">
        {/* Time progress bar */}
        <div className="flex items-center gap-2 text-2xs text-text-muted">
          <Calendar size={10} className={isExpiring ? 'text-warning' : ''} />
          <span className={isExpiring ? 'text-warning font-bold' : ''}>
            {daysLeft > 0 ? `${daysLeft} dni do końca` : 'Dziś ewaluacja'}
          </span>
          <span className="ml-auto opacity-60">Dodano: {rec.created_at.slice(0, 10)}</span>
        </div>
        <div className="h-1 w-full rounded-full bg-surface-solid overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: isExpiring ? 'var(--color-warning)' : 'var(--color-primary)',
            }}
          />
        </div>
        {rec.success_threshold !== null && (
          <div className="flex items-center gap-1 text-2xs text-text-muted">
            <Target size={9} />
            <span>
              Cel:{' '}
              <span className="font-bold text-text-secondary">
                {getMetaMeta(rec.related_metric).label} ≥ {rec.success_threshold}
              </span>
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function GeneralRecommendationsPanel({
  recommendations,
}: GeneralRecommendationsPanelProps) {
  const [showAllHistory, setShowAllHistory] = React.useState(false);
  const todayStr = React.useMemo(() => getTodayWarsaw(), []);

  const pending = recommendations.filter((r) => r.status === 'pending');
  const evaluated = recommendations
    .filter((r) => r.status === 'evaluated')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Group pending by related_metric
  const metricGroups = Object.entries(
    pending.reduce<Record<string, OracleRecommendation[]>>((acc, r) => {
      const key = r.related_metric || 'other';
      (acc[key] ??= []).push(r);
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b.length - a.length);

  const displayedEvaluated = showAllHistory ? evaluated : evaluated.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Active Recommendations — grouped by metric */}
        <div className="md:col-span-2">
          <Panel title={`Aktywne Zalecenia Wyroczni (${pending.length})`}>
            <div className="space-y-4 max-h-[var(--ds-h-300px)] overflow-y-auto pr-1">
              {metricGroups.map(([metric, recs]) => {
                const meta = getMetaMeta(metric);
                return (
                  <div key={metric}>
                    <MetricGroupHeader
                      metric={meta.label}
                      count={recs.length}
                      color={meta.color}
                      icon={meta.icon}
                    />
                    <div className="space-y-2">
                      {recs.map((rec) => (
                        <RecommendationPendingCard key={rec.id} rec={rec} todayStr={todayStr} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {pending.length === 0 && (
                <div className="text-center py-8 text-text-muted text-xs font-semibold border border-dashed border-border-custom/60 rounded-xl bg-surface/20">
                  Brak aktywnych zaleceń. Zapytaj Wyrocznię o radę, aby wyznaczyć nowe zalecenia.
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Stats */}
        <div>
          <Panel title="Skuteczność Wyroczni">
            <OracleStats evaluated={evaluated} />
          </Panel>
        </div>
      </div>

      {/* History — timeline */}
      {evaluated.length > 0 && (
        <Panel title={`Historia rozliczonych (${evaluated.length})`}>
          <div className="space-y-0 max-h-[var(--ds-h-350px)] overflow-y-auto pr-1">
            {displayedEvaluated.map((rec) => (
              <HistoryTimelineItem key={rec.id} rec={rec} />
            ))}
          </div>
          {evaluated.length > 5 && (
            <div className="pt-2 flex justify-center border-t border-border-custom/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllHistory((v) => !v)}
                icon={showAllHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                className="text-xs font-bold text-text-secondary hover:text-text-primary"
              >
                {showAllHistory ? 'Zwiń do ostatnich 5' : `Pokaż całą historię (${evaluated.length})`}
              </Button>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
