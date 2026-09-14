import { getTodayWarsaw } from '../../../lib/date';
import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { StatHero } from '../../ui/StatHero';
import Button from '../../ui/Button';
import { computeLenieInsight, computeLenieStats, daysBefore, type LenieLogRow, type OuraRow } from '../desktopUtils';
import type { PhoneUsageRow } from '../../../lib/desktopDashboardTypes';
import { computeLenieCorrelations } from './lenieCorrelations';
import LeniePatternsModal from './LeniePatternsModal';
import { ChevronRight, Clock, Flame } from 'lucide-react';

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

interface SparklineProps {
  stats: ReturnType<typeof computeLenieStats>;
  hourly24: { hour: number; label: string; count: number }[];
  maxHour: number;
  onOpen: () => void;
}

function LenieSparkline24({ stats, hourly24, maxHour, onOpen }: SparklineProps) {
  return (
    <div
      className="flex items-center gap-2 cursor-pointer group"
      onClick={onOpen}
      title="Kliknij, aby otworzyć szczegółowy rozkład 24h"
    >
      <div className="flex items-center gap-1 text-2xs text-text-muted group-hover:text-text-primary transition-colors">
        <Clock className="w-3.5 h-3.5 text-text-muted/70" />
        <span className="font-medium">Rozkład 24h:</span>
        <span className="font-semibold text-danger">{stats.nightWindowPct}% noc (20–01)</span>
        <span className="text-text-muted/40">·</span>
        <span className="text-warning font-medium">{stats.afternoonWindowPct}% popołudnie</span>
      </div>

      <div className="flex items-end gap-0.5 h-5 px-1.5 py-0.5 bg-surface-ground/40 rounded border border-border-custom/20">
        {hourly24.map((slot) => {
          const barH = slot.count > 0 ? Math.max(3, Math.round((slot.count / maxHour) * 16)) : 1;
          const isNight = slot.hour >= 20 || slot.hour <= 1;
          const isAft = slot.hour >= 13 && slot.hour <= 17;
          const bg =
            slot.count === 0
              ? 'bg-text-muted/15'
              : isNight
              ? 'bg-danger'
              : isAft
              ? 'bg-warning'
              : 'bg-primary/70';

          return (
            <div
              key={slot.hour}
              style={{ height: `${barH}px`, width: '3px' }}
              className={`rounded-t-xxs ${bg}`}
              title={`${slot.label}:00 – ${slot.count}×`}
            />
          );
        })}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-text-muted/50 group-hover:text-text-primary transition-colors" />
    </div>
  );
}

export default function LeniePanelMini({ logs, phoneUsage, oura }: LeniePanelMiniProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allLogs = logs || [];
  const totalMonth = allLogs.filter((l) => l.date >= daysBefore(30)).length;
  const totalWeek  = allLogs.filter((l) => l.date >= daysBefore(7)).length;
  const lastDate   = allLogs[0]?.date ?? null;
  const todayStr   = getTodayWarsaw();

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
          stats={computeLenieStats([])}
        />
      </>
    );
  }

  const insight = computeLenieInsight(allLogs);
  const stats   = computeLenieStats(allLogs);
  const correlations = computeLenieCorrelations(allLogs, phoneUsage, oura);
  const hourly24 = stats?.hourly24 ?? [];
  const maxHour = Math.max(...hourly24.map((h) => h.count), 1);

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
        <div className="flex items-center gap-6">
          <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-25em)] text-danger/50 shrink-0">
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

          <div className="flex-1 min-w-0 border-l border-border-custom/40 pl-5">
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

        {/* ── Row 2: frequency + correlations + 24-hour inline breakdown ── */}
        <div className="flex items-center justify-between gap-4 border-t border-border-custom/25 pt-2 flex-wrap">
          {/* Ejaculation frequency */}
          <div className="flex items-baseline gap-3 shrink-0 flex-wrap">
            <span className="text-2xs text-text-muted">
              <span className="font-bold text-sm text-text-primary">{stats.totalEjaculations30}</span>
              {' '}ejak./30d
            </span>
            <span className="text-2xs text-text-muted">
              ø <span className="font-semibold text-text-primary">{stats.avgPerDay}</span>/dzień
            </span>
            {stats.maxPerDay > 1 && (
              <span className="text-2xs text-text-muted">
                max <span className="font-bold text-danger">{stats.maxPerDay}×</span>/dzień
              </span>
            )}
            {stats.multiDayCount > 0 && (
              <span className="text-2xs text-text-muted/60">
                {stats.multiDayCount}&nbsp;dni wielokrotnych
              </span>
            )}
          </div>

          {/* Behavioral correlation highlight if available */}
          {(correlations.riskWindowAlert || correlations.sleepCorrelationText || correlations.phoneCorrelationText) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-danger/10 border border-danger/20 text-3xs text-danger font-medium">
              <span>{correlations.riskWindowAlert || correlations.sleepCorrelationText || correlations.phoneCorrelationText}</span>
            </div>
          )}

          {/* 24h mini bars preview */}
          <LenieSparkline24
            stats={stats}
            hourly24={hourly24}
            maxHour={maxHour}
            onOpen={() => setIsModalOpen(true)}
          />
        </div>
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
