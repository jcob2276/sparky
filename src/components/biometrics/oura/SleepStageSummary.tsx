interface SleepStageSummaryProps {
  awakeMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  totalSleepMinutes: number;
}

const duration = (minutes: number) => {
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
    { label: 'Stan czuwania', minutes: awakeMinutes, color: 'bg-stone-100', percent: null },
    { label: 'REM', minutes: remMinutes, color: 'bg-sky-300', percent: Math.round(remMinutes / totalSleepMinutes * 100) },
    { label: 'Płytki', minutes: lightMinutes, color: 'bg-sky-500', percent: Math.round(lightMinutes / totalSleepMinutes * 100) },
    { label: 'Głęboki', minutes: deepMinutes, color: 'bg-sky-800', percent: Math.round(deepMinutes / totalSleepMinutes * 100) },
  ];

  return (
    <div className="space-y-4">
      {rows.map(({ color, label, minutes, percent }) => {
        const text = `${label} ${duration(minutes)}${percent == null ? '' : ` ${percent}%`}`;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
            <p className="flex-1 text-sm text-slate-200">{text}</p>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5 sm:w-36">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${percent ?? Math.min(100, awakeMinutes / Math.max(1, totalSleepMinutes) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
