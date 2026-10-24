import { AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import type { MarkerSeries } from '../../../lib/health/medicalAnalytics';
import { formatMedicalDate } from '../../../lib/health/medicalAnalytics';
import {
  buildPanelFreshness,
  buildPersonalInsights,
  formatAge,
  type InsightTone,
  type PanelFreshnessStatus,
  type SupplementRef,
} from '../../../lib/health/medicalPersonalOverview';
import { getTodayWarsaw } from '../../../lib/date';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';

interface MedicalOverviewProps {
  series: MarkerSeries[];
  supplements: SupplementRef[];
  onSelectMarker: (markerKey: string) => void;
  onActionClick: (sectionId: string) => void;
}

const STATUS_STYLE: Record<PanelFreshnessStatus, { dot: string; text: string; hint: string }> = {
  fresh: { dot: 'bg-success', text: 'text-text-primary', hint: 'aktualne' },
  aging: { dot: 'bg-warning', text: 'text-text-primary', hint: 'starzeje się' },
  stale: { dot: 'bg-danger', text: 'text-warning', hint: 'do odświeżenia' },
  missing: { dot: 'bg-border-custom', text: 'text-text-muted', hint: 'brak danych' },
};

const TONE_ICON: Record<InsightTone, { Icon: typeof Info; className: string }> = {
  good: { Icon: CheckCircle2, className: 'text-success' },
  watch: { Icon: AlertTriangle, className: 'text-warning' },
  info: { Icon: Info, className: 'text-text-muted' },
};

/** Personal overview: how fresh each panel is, and the few things in the user's own data worth a look. */
export default function MedicalOverview({ series, supplements, onSelectMarker, onActionClick }: MedicalOverviewProps) {
  const today = getTodayWarsaw();
  const panels = buildPanelFreshness(series, today);
  const insights = buildPersonalInsights({ series, supplements, today });
  const lastDate = panels.reduce<string | null>((latest, p) => (p.lastDate && p.lastDate > (latest ?? '') ? p.lastDate : latest), null);
  const needsRefresh = panels.filter((p) => p.status === 'stale').length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold font-display">Twój obraz</h2>
        <p className="text-xs text-text-muted">
          {lastDate ? `Ostatnie badanie: ${formatMedicalDate(lastDate)}.` : 'Brak wyników.'}
          {needsRefresh > 0 && ` ${needsRefresh} z ${panels.length} grup wymaga odświeżenia.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {panels.map((panel) => {
          const style = STATUS_STYLE[panel.status];
          return (
            <Pressable
              key={panel.id}
              type="button"
              onClick={() => onActionClick('wyniki')}
              className="rounded-2xl border border-border-custom/60 bg-surface-solid/30 p-3 text-left active:scale-95 ui-interactive"
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                <span className="truncate text-xs font-semibold text-text-primary">{panel.label}</span>
              </div>
              <p className={`mt-1 text-2xs font-medium ${style.text}`}>
                {panel.ageDays != null ? formatAge(panel.ageDays) : style.hint}
              </p>
              {panel.ageDays != null && <p className="text-2xs text-text-muted">{style.hint}</p>}
            </Pressable>
          );
        })}
      </div>

      {insights.length > 0 && (
        <Card variant="outline" padding="0" className="divide-y divide-border-custom/40 bg-background/30">
          <p className="px-4 pt-3 pb-2 text-2xs font-semibold tracking-wide text-text-muted">Dla Ciebie</p>
          {insights.map((insight) => {
            const { Icon, className } = TONE_ICON[insight.tone];
            const markerKey = insight.markerKey;
            return (
              <Pressable
                key={insight.id}
                type="button"
                disabled={!markerKey}
                onClick={() => markerKey && onSelectMarker(markerKey)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-surface-solid/60 ui-interactive disabled:cursor-default"
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-text-primary">{insight.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-text-muted">{insight.detail}</p>
                </div>
              </Pressable>
            );
          })}
        </Card>
      )}

      {needsRefresh > 0 && (
        <Pressable
          type="button"
          onClick={() => onActionClick('sugestie')}
          className="flex items-center gap-1 text-xs font-semibold text-primary active:scale-95"
        >
          Zaplanuj kolejny panel <ArrowRight size={12} aria-hidden="true" />
        </Pressable>
      )}
    </div>
  );
}
