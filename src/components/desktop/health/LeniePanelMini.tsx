import { getTodayWarsaw } from '../../../lib/date';
import React, { useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { StatHero } from '../../ui/StatHero';
import Button from '../../ui/Button';
import { computeLenieInsight, computeLenieStats, daysBefore, type LenieLogRow, type OuraRow } from '../desktopUtils';
import type { PhoneUsageRow } from '../../../lib/desktopDashboardTypes';
import { computeLenieCorrelations } from './lenieCorrelations';
import LeniePatternsModal from './LeniePatternsModal';
import { ChevronRight, Flame } from 'lucide-react';

export interface LeniePanelMiniProps {
  logs?: LenieLogRow[];
  phoneUsage?: PhoneUsageRow[];
  oura?: OuraRow[];
}

function LenieCleanCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card
      variant="surface"
      padding="0.875rem 1.25rem"
      className="flex items-center justify-between gap-4 border border-border-custom/50 bg-surface/30"
    >
      <div className="flex items-center gap-3">
        <Flame className="w-4 h-4 text-success" />
        <div>
          <p className="text-xs font-bold text-text-primary">Lenie · Kontrola impulsów: Czysto 🔥</p>
          <p className="text-2xs text-text-muted">Brak zarejestrowanych incydentów w bazie. Pełna kontrola dopaminy i układu nagrody.</p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onOpen}
        className="text-xs font-semibold text-text-secondary hover:text-text-primary"
        icon={<Flame className="w-3.5 h-3.5 text-text-muted" />}
      >
        <span>Wzorce & Statystyki</span>
      </Button>
    </Card>
  );
}

export default function LeniePanelMini({ logs, phoneUsage, oura }: LeniePanelMiniProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allLogs = logs || [];
  const totalMonth = allLogs.filter((l) => l.date >= daysBefore(30)).length;
  const totalWeek  = allLogs.filter((l) => l.date >= daysBefore(7)).length;
  const lastDate   = allLogs[0]?.date ?? null;
  const todayStr   = getTodayWarsaw();
  // The day is part of the cache key because statistics include a rolling 30-day window.
  const stats = useMemo(() => {
    void todayStr;
    return computeLenieStats(logs ?? []);
  }, [logs, todayStr]);

  const daysFree = lastDate
    ? Math.round(
        (new Date(todayStr + 'T12:00:00Z').getTime() - new Date(lastDate + 'T12:00:00Z').getTime()) / 86400000
      )
    : null;

  const freeColor =
    daysFree === null  ? 'text-text-muted'
    : daysFree === 0   ? 'text-danger'
    : daysFree <= 2    ? 'text-warning'
    :                    'text-success';

  if (!allLogs.length) {
    return (
      <>
        <LenieCleanCard onOpen={() => setIsModalOpen(true)} />
        <LeniePatternsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stats={stats}
        />
      </>
    );
  }

  const insight = computeLenieInsight(allLogs);
  const correlations = computeLenieCorrelations(allLogs, phoneUsage, oura);

  return (
    <>
      <Card
        variant="surface"
        padding="0.875rem 1.25rem"
        className="flex flex-col gap-2.5"
        style={{
          border: 'var(--border-width-thin) solid var(--color-theme-hex-ba2446394015)',
          background: 'var(--color-theme-hex-ba24463940025)',
        }}
      >
        {/* ── Row 1: label + stats chips + insight text + modal button ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-2xs font-semibold tracking-[var(--ds-arbitrary-0-25em)] text-danger/50 shrink-0">
            Lenie
          </p>

          <div className="flex items-center gap-5 shrink-0">
            {[
              { label: 'Ten tydzień', val: totalWeek,  color: totalWeek > 0 ? 'text-danger' : 'text-success' },
              { label: '30 dni',      val: totalMonth, color: 'text-text-secondary' },
              { label: 'Streak',      val: daysFree !== null ? `${daysFree}d` : '—', color: freeColor },
            ].map(({ label, val, color }) => (
              <StatHero key={label} value={val} label={label} color={color} size="sm" />
            ))}
          </div>

          <div className="min-w-0 basis-full sm:flex-1 sm:basis-0 sm:border-l sm:border-border-custom/40 sm:pl-5">
            {insight ? (
              <p className="text-xs text-text-secondary leading-relaxed">{insight}</p>
            ) : (
              <p className="text-xs text-text-muted italic">Za mało danych do analizy.</p>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-custom/40 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Pokaż pełną analizę 24h i wzorce"
            icon={<Flame className="w-3.5 h-3.5 text-danger" />}
          >
            <span>Wzorce & Godziny</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          </Button>
        </div>

        {(correlations.riskWindowAlert || correlations.sleepCorrelationText || correlations.phoneCorrelationText) && (
          <p className="rounded-md border border-danger/20 bg-danger/10 px-2.5 py-1 text-2xs font-medium text-danger">
            {correlations.riskWindowAlert || correlations.sleepCorrelationText || correlations.phoneCorrelationText}
          </p>
        )}
      </Card>

      {/* Deep Behavioral Patterns & Hourly Modal */}
      <LeniePatternsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stats={stats}
      />
    </>
  );
}
