import React from 'react';
import { Panel } from '../../shell/Panel';
import { Card } from '../../../ui/Card';
import { Pressable } from '../../../ui/ControlPrimitives';
import type { OracleRecommendation } from '../../../../lib/recommendationsApi';
import {
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  Archive,
  Compass,
} from 'lucide-react';
import { getTodayWarsaw } from '../../../../lib/date';

import { MetricGroupHeader } from './GeneralRecommendationsHistory';
import { getMetaMeta } from './recommendationConfig';

interface GeneralRecommendationsPanelProps {
  recommendations: OracleRecommendation[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getDaysDiff(createdAt: string, windowDays: number, todayStr: string): number {
  const createdDate = new Date(createdAt.slice(0, 10) + 'T12:00:00Z');
  const endDate = new Date(createdDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const today = new Date(todayStr + 'T12:00:00Z');
  return Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000);
}

function getTimeProgress(createdAt: string, windowDays: number, todayStr: string): number {
  const start = new Date(createdAt.slice(0, 10) + 'T12:00:00Z').getTime();
  const end = start + windowDays * 86_400_000;
  const now = new Date(todayStr + 'T12:00:00Z').getTime();
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

// ─── PENDING CARD ─────────────────────────────────────────────────────────────

function RecommendationPendingCard({
  rec,
  todayStr,
  isStale = false,
}: {
  rec: OracleRecommendation;
  todayStr: string;
  isStale?: boolean;
}) {
  const diffDays = getDaysDiff(rec.created_at, rec.evaluation_window_days, todayStr);
  const progress = getTimeProgress(rec.created_at, rec.evaluation_window_days, todayStr);
  const isExpiring = diffDays >= 0 && diffDays <= 2;

  let timeBadgeText: string;
  if (diffDays > 0) {
    timeBadgeText = `${diffDays} dni do końca`;
  } else if (diffDays === 0) {
    timeBadgeText = 'Dziś ewaluacja';
  } else {
    timeBadgeText = `Okno minęło ${Math.abs(diffDays)}d temu`;
  }

  return (
    <Card
      padding="0.75rem"
      className={`ui-interactive duration-[var(--motion-medium)] space-y-2 ${
        isStale ? 'opacity-75 bg-surface/20 border-border-custom/50' : 'hover:border-primary/20 hover:shadow-sm'
      }`}
    >
      <p className="text-xs font-semibold text-text-primary leading-relaxed">{rec.recommendation_text}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-2xs text-text-muted">
          <Calendar size={10} className={isExpiring ? 'text-warning' : isStale ? 'opacity-40' : ''} />
          <span className={isExpiring ? 'text-warning font-bold' : isStale ? 'text-text-muted' : ''}>
            {timeBadgeText}
          </span>
          <span className="ml-auto opacity-60">Dodano: {rec.created_at.slice(0, 10)}</span>
        </div>
        {!isStale && (
          <div className="h-1 w-full rounded-full bg-surface-solid overflow-hidden">
            <div
              className="h-full rounded-full ui-interactive"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: isExpiring ? 'var(--color-warning)' : 'var(--color-primary)',
              }}
            />
          </div>
        )}
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
  const todayStr = React.useMemo(() => getTodayWarsaw(), []);
  const [showArchive, setShowArchive] = React.useState(false);

  // Deduplicate pending recommendations by normalized text, keeping the newest entry
  const deduplicatedPending = React.useMemo(() => {
    const raw = recommendations.filter((r) => r.status === 'pending');
    const sorted = [...raw].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const seen = new Set<string>();
    const out: OracleRecommendation[] = [];
    for (const r of sorted) {
      const key = (r.recommendation_text || '').toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
    return out;
  }, [recommendations]);

  // Active Governor: isolate max 3 high-leverage distinct domain recommendations
  const { activeRecs, staleRecs } = React.useMemo(() => {
    const fresh = deduplicatedPending.filter((r) => {
      const diff = getDaysDiff(r.created_at, r.evaluation_window_days, todayStr);
      return diff >= -7;
    });

    if (fresh.length > 0) {
      return {
        activeRecs: fresh.slice(0, 3),
        staleRecs: deduplicatedPending.filter((r) => !fresh.includes(r)),
      };
    }

    // All are older cycles: choose 1 per distinct domain (max 3)
    const domainMap = new Map<string, OracleRecommendation>();
    const overflow: OracleRecommendation[] = [];

    for (const r of deduplicatedPending) {
      const domain = r.related_metric || 'other';
      if (!domainMap.has(domain) && domainMap.size < 3) {
        domainMap.set(domain, r);
      } else {
        overflow.push(r);
      }
    }

    return {
      activeRecs: Array.from(domainMap.values()),
      staleRecs: overflow,
    };
  }, [deduplicatedPending, todayStr]);

  // Group activeRecs by related_metric
  const activeMetricGroups = React.useMemo(() => {
    return Object.entries(
      activeRecs.reduce<Record<string, OracleRecommendation[]>>((acc, r) => {
        const key = r.related_metric || 'other';
        (acc[key] ??= []).push(r);
        return acc;
      }, {})
    ).sort(([, a], [, b]) => b.length - a.length);
  }, [activeRecs]);

  return (
    <div className="space-y-5">
      {/* Active Recommendations — Governor limits cognitive load to Top 3 */}
      <div>
        <Panel title={`Aktywne Zalecenia Wyroczni (${activeRecs.length})`}>
          <div className="space-y-4 max-h-[var(--ds-h-350px)] overflow-y-auto pr-1">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-primary">
                <Compass size={14} />
                Governor uwagi: max 3 priorytety
              </span>
              <span className="text-3xs text-text-muted">
                Dedykowane skupienie poznawcze
              </span>
            </div>

            {activeMetricGroups.map(([metric, recs]) => {
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
            {activeRecs.length === 0 && (
              <div className="text-center py-8 text-text-muted text-xs font-semibold border border-dashed border-border-custom/60 rounded-xl bg-surface/20">
                Brak aktywnych zaleceń. Zapytaj Wyrocznię o radę, aby wyznaczyć nowe zalecenia.
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Stale / Previous Cycle Archive */}
      {staleRecs.length > 0 && (
        <div>
          <Pressable
            onClick={() => setShowArchive((v) => !v)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border-custom bg-surface/30 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Archive size={14} className="text-text-muted" />
              Zalecenia z wcześniejszych cykli ({staleRecs.length})
            </span>
            <span className="text-2xs flex items-center gap-1 font-bold">
              {showArchive ? 'Zwiń archiwum' : 'Pokaż'}
              {showArchive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          </Pressable>

          {showArchive && (
            <div className="mt-3 space-y-2 max-h-[var(--ds-h-280px)] overflow-y-auto pr-1">
              {staleRecs.map((rec) => (
                <RecommendationPendingCard key={rec.id} rec={rec} todayStr={todayStr} isStale />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
