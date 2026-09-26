import { FC } from 'react';
import { DashboardData } from '../../lib/investments/dashboardService';

interface Props {
  activity: DashboardData['activity14d'];
}

export const DashboardActivityChart: FC<Props> = ({ activity }) => {
  const maxDayTotal = Math.max(...activity.days.map((d) => d.total), 1);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Aktywność źródeł 14 DNI
          </span>
          <span className="font-mono text-xl font-black text-primary tabular-nums">
            {activity.total.toLocaleString()}
          </span>
        </div>
        <p className="text-3xs text-text-secondary mt-0.5">
          Zdarzeń ze wszystkich źródeł · szczyt {activity.peakDateLabel}
        </p>
      </div>

      {/* 14-day Stacked Bar Chart */}
      <div className="pt-4 pb-2">
        <div className="h-32 flex items-end justify-between gap-1.5 sm:gap-2 px-1">
          {activity.days.map((day) => {
            const heightPct = Math.max((day.total / maxDayTotal) * 100, 6);
            const shortH = day.total > 0 ? (day.shorts / day.total) * 100 : 0;
            const insH = day.total > 0 ? (day.insiders / day.total) * 100 : 0;
            const fundH = day.total > 0 ? (day.funds / day.total) * 100 : 0;
            const polH = day.total > 0 ? (day.politicians / day.total) * 100 : 0;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip */}
                <div className="absolute -top-10 hidden group-hover:flex items-center bg-surface border border-border-custom px-2 py-1 rounded-md text-3xs font-mono shadow-lg whitespace-nowrap pointer-events-none">
                  <div>{day.date}: {day.total} zdarzeń</div>
                </div>

                {/* Stacked bar */}
                <div
                  className="w-full rounded-md overflow-hidden flex flex-col-reverse transition-all bg-border-custom/30 group-hover:brightness-110"
                  style={{ height: `${heightPct}%` }}
                >
                  {/* Short GPW */}
                  {shortH > 0 && <div className="bg-danger" style={{ height: `${shortH}%` }} />}
                  {/* Insiderzy */}
                  {insH > 0 && <div className="bg-warning" style={{ height: `${insH}%` }} />}
                  {/* Fundusze */}
                  {fundH > 0 && <div className="bg-info" style={{ height: `${fundH}%` }} />}
                  {/* Politycy */}
                  {polH > 0 && <div className="bg-primary" style={{ height: `${polH}%` }} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Date Axis */}
        <div className="flex justify-between items-center text-3xs font-mono text-text-muted pt-2 px-1 border-t border-border-custom/30">
          <span>{activity.days[0]?.label || '13 WRZ'}</span>
          <span>{activity.days[Math.floor(activity.days.length / 2)]?.label || '20 WRZ'}</span>
          <span>{activity.days[activity.days.length - 1]?.label || '26 WRZ'}</span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-custom/30 text-xs font-mono">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border-custom/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
            <span className="text-3xs text-text-secondary">Politycy</span>
          </div>
          <span className="font-bold text-text-primary text-xs">{activity.sources.politicians}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border-custom/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-info shrink-0" />
            <span className="text-3xs text-text-secondary">Fundusze 13F</span>
          </div>
          <span className="font-bold text-text-primary text-xs">{activity.sources.funds}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border-custom/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning shrink-0" />
            <span className="text-3xs text-text-secondary">Insiderzy</span>
          </div>
          <span className="font-bold text-text-primary text-xs">{activity.sources.insiders}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border-custom/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-danger shrink-0" />
            <span className="text-3xs text-text-secondary">Short GPW</span>
          </div>
          <span className="font-bold text-danger text-xs">{activity.sources.shorts}</span>
        </div>
      </div>
    </div>
  );
};
