import React from 'react';
import Modal from '../../ui/Modal';
import type { LenieStatsResult } from '../desktopUtils';
import LenieHourlyHistogram from './LenieHourlyHistogram';
import { AlertTriangle, Clock, Flame, ShieldCheck } from 'lucide-react';

interface LeniePatternsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: LenieStatsResult;
}

export default function LeniePatternsModal({
  isOpen,
  onClose,
  stats,
}: LeniePatternsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-danger" />
          <span className="font-bold text-text-primary">Wzorce Behawioralne & Rozkład Godzin</span>
        </div>
      }
      subtitle="Analiza czasowa, strefy krytyczne i mechanizmy wyzwalające"
      size="xl"
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-danger/10 border border-danger/25 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-danger text-2xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5" />
              Noc (20–01)
            </div>
            <div className="text-xl font-black text-danger">{stats.nightWindowPct}%</div>
            <div className="text-2xs text-text-muted mt-0.5">{stats.nightWindowCount} zdarzeń w historii</div>
          </div>

          <div className="bg-warning/10 border border-warning/25 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-warning text-2xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5" />
              Popołudnie (13–17)
            </div>
            <div className="text-xl font-black text-warning">{stats.afternoonWindowPct}%</div>
            <div className="text-2xs text-text-muted mt-0.5">{stats.afternoonWindowCount} zdarzeń w historii</div>
          </div>

          <div className="bg-surface-elevated border border-border-custom/40 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-text-secondary text-2xs font-bold uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5 text-danger/70" />
              Razem 30 dni
            </div>
            <div className="text-xl font-black text-text-primary">{stats.totalEjaculations30}</div>
            <div className="text-2xs text-text-muted mt-0.5">ø {stats.avgPerDay} / aktywny dzień</div>
          </div>

          <div className="bg-success/10 border border-success/25 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-success text-2xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Poranek (02–11)
            </div>
            <div className="text-xl font-black text-success">
              {Math.max(0, 100 - stats.nightWindowPct - stats.afternoonWindowPct)}%
            </div>
            <div className="text-2xs text-text-muted mt-0.5">Strefa stabilna</div>
          </div>
        </div>

        {/* 24-hour histogram */}
        <div className="bg-surface-elevated border border-border-custom/30 rounded-lg p-4">
          <LenieHourlyHistogram
            hourly24={stats.hourly24}
            topHoursText={stats.topHoursText}
            nightWindowPct={stats.nightWindowPct}
            afternoonWindowPct={stats.afternoonWindowPct}
          />
        </div>

        {/* Patterns List */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            Wykryte Prawidłowości Behawioralne
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {stats.patterns.map((p) => {
              const badgeColors =
                p.badgeType === 'danger'
                  ? 'bg-danger/15 text-danger border-danger/30'
                  : p.badgeType === 'warning'
                  ? 'bg-warning/15 text-warning border-warning/30'
                  : 'bg-primary/15 text-primary border-primary/30';

              return (
                <div
                  key={p.title}
                  className="bg-surface-ground/60 border border-border-custom/30 rounded-lg p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-text-primary">{p.title}</span>
                      <span className={`text-3xs font-mono px-2 py-0.5 rounded border font-semibold ${badgeColors}`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-2xs text-text-secondary leading-relaxed">{p.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent logs with exact timestamps */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Ostatnie wpadki z dokładną godziną
          </h4>
          <div className="border border-border-custom/30 rounded-lg divide-y divide-border-custom/20 max-h-48 overflow-y-auto bg-surface-ground/40">
            {stats.recentLogs.map((log, idx) => (
              <div key={`${log.date}-${idx}`} className="px-3 py-2 flex items-center justify-between text-2xs gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-text-primary font-medium">{log.date}</span>
                  {log.timeStr ? (
                    <span className="font-mono text-danger bg-danger/10 px-1.5 py-0.5 rounded text-3xs font-bold">
                      {log.timeStr}
                    </span>
                  ) : (
                    <span className="text-text-muted/50 text-3xs">—</span>
                  )}
                </div>
                <div className="text-text-secondary truncate text-right">
                  <span className="font-medium text-text-primary">{log.stimulus}</span>
                  {log.context && <span className="text-text-muted ml-1.5 italic">({log.context})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
