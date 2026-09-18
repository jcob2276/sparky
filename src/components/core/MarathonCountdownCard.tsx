import { Flame, Trophy } from 'lucide-react';

interface MarathonCountdownCardProps {
  raceDate?: string;
  raceName?: string;
}

const RACE_DATE_DEFAULT = '2026-10-04T00:00:00';
const RACE_NAME_DEFAULT = 'Maraton w Koszycach';
const PREP_START_DATE = '2026-06-15T00:00:00';

export default function MarathonCountdownCard({
  raceDate = RACE_DATE_DEFAULT,
  raceName = RACE_NAME_DEFAULT,
}: MarathonCountdownCardProps) {
  const now = new Date().getTime();
  const target = new Date(raceDate).getTime();
  const start = new Date(PREP_START_DATE).getTime();

  const daysLeft = Math.ceil((target - now) / 86400000);
  if (daysLeft < 0) return null;

  const totalPrepDays = Math.max(1, Math.ceil((target - start) / 86400000));
  const elapsedDays = Math.max(0, Math.ceil((now - start) / 86400000));
  const progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalPrepDays) * 100)));

  const weeksLeft = Math.floor(daysLeft / 7);
  const remainingDays = daysLeft % 7;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-custom/80 bg-surface-solid/35 p-4 text-left shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <Trophy size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-3xs font-black uppercase tracking-wider text-primary">
                Cel Główny · 42.2 km
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-3xs font-bold text-primary">
                <Flame size={10} /> {progressPct}% cyklu
              </span>
            </div>
            <h3 className="truncate text-sm font-black text-text-primary leading-tight mt-0.5">
              {raceName}
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-base font-black tabular-nums text-text-primary leading-tight">
            {daysLeft} <span className="text-2xs font-normal text-text-muted">dni</span>
          </div>
          <div className="text-3xs font-semibold text-text-muted">
            {weeksLeft > 0 ? `${weeksLeft} tyg. ${remainingDays} dni` : 'Ostatnia prosta!'}
          </div>
        </div>
      </div>

      {/* Preparation Progress Bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-custom/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-success ui-interactive"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
