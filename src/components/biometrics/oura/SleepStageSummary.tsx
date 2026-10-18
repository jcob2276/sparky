interface SleepStageSummaryProps {
  awakeMinutes: number | null;
  deepMinutes: number | null;
  lightMinutes: number | null;
  remMinutes: number | null;
  totalSleepMinutes: number | null;
}

const duration = (minutes: number) => {
  if (!Number.isFinite(minutes)) return 'Brak danych';
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return hours > 0 ? `${hours} h ${remaining} min` : `${remaining} min`;
};

export function SleepStageSummary({
  awakeMinutes,
  deepMinutes,
  lightMinutes,
  remMinutes,
  totalSleepMinutes,
}: SleepStageSummaryProps) {
  const rows = [
    { label: 'Stan czuwania', minutes: awakeMinutes, color: 'bg-stone-100' },
    { label: 'REM', minutes: remMinutes, color: 'bg-info/60' },
    { label: 'Płytki', minutes: lightMinutes, color: 'bg-info' },
    { label: 'Głęboki', minutes: deepMinutes, color: 'bg-info/35' },
  ];

  return (
    <div className="space-y-4">
      {rows.map(({ color, label, minutes }) => {
        const isAwake = label === 'Stan czuwania';
        const percent = !isAwake && minutes != null && totalSleepMinutes != null && totalSleepMinutes > 0
          ? Math.round(minutes / totalSleepMinutes * 100)
          : null;
        const text = `${label} ${minutes == null ? 'Brak danych' : duration(minutes)}${percent == null ? '' : ` ${percent}%`}`;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
            <p className="flex-1 text-sm text-text-primary">{text}</p>
            {percent != null && (
              <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5 sm:w-36">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
