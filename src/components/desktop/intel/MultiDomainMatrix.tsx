import { useState } from 'react';
import { Layers, CheckSquare, Square } from 'lucide-react';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';
import { useMultiDomainMatrixData } from './useMultiDomainMatrixData';
import { MultiDomainMatrixToggles } from './MultiDomainMatrixToggles';
import { MultiDomainMatrixGrid } from './MultiDomainMatrixGrid';
import { MultiDomainMatrixTooltip } from './MultiDomainMatrixTooltip';
import { MultiDomainMatrixInsights } from './MultiDomainMatrixInsights';
import type { DesktopSessionRow, StravaActivityRow } from '../../../lib/desktopDashboardTypes';
import type { LenieLogRow } from '../desktopUtils';
import type { HabitRow } from '../shell/useDesktopData';
import type { DayMatrixDetail } from './multiDomainMatrixTypes';

interface Props {
  userId?: string;
  sessions: DesktopSessionRow[];
  strava: StravaActivityRow[];
  lenieLogs: LenieLogRow[];
  habits: HabitRow[];
  proteinFloorG?: number;
}

export default function MultiDomainMatrix({
  userId,
  sessions,
  strava,
  lenieLogs,
  habits,
  proteinFloorG,
}: Props) {
  const {
    weeks,
    stats,
    selectedLayers,
    toggleLayer,
    selectAll,
    clearAll,
  } = useMultiDomainMatrixData({
    userId,
    sessions,
    strava,
    lenieLogs,
    habits,
    proteinFloorG,
  });

  const [tooltip, setTooltip] = useState<{
    day: DayMatrixDetail;
    rect: DOMRect;
  } | null>(null);

  return (
    <Card
      id="multi-domain-matrix"
      padding="1.25rem"
      className="border-border-custom bg-surface/30 space-y-4 scroll-mt-28"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-custom">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">
              Wielodomenowa Mapa Korelacji — 13 Tygodni
            </h3>
            <p className="text-xs text-text-muted">
              Wybierz i nałóż wymiary życia, aby zobaczyć synchronizację dyscypliny, makro i regeneracji
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="text-3xs text-text-muted hover:text-text-primary px-2 py-1 h-7"
          >
            <CheckSquare size={13} className="mr-1" />
            Wszystkie
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-3xs text-text-muted hover:text-text-primary px-2 py-1 h-7"
          >
            <Square size={13} className="mr-1" />
            Wyczyść
          </Button>
        </div>
      </div>

      {/* Layer Toggles */}
      <MultiDomainMatrixToggles
        selectedLayers={selectedLayers}
        onToggleLayer={toggleLayer}
      />

      {/* 13-Week Grid */}
      <MultiDomainMatrixGrid
        weeks={weeks}
        selectedLayers={selectedLayers}
        onHoverDay={(day, rect) => setTooltip({ day, rect })}
        onLeaveDay={() => setTooltip(null)}
      />

      {/* Floating Tooltip */}
      {tooltip && (
        <MultiDomainMatrixTooltip
          day={tooltip.day}
          rect={tooltip.rect}
          selectedLayers={selectedLayers}
        />
      )}

      {/* Dynamic Correlation Insights */}
      <MultiDomainMatrixInsights stats={stats} />
    </Card>
  );
}
