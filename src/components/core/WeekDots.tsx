interface WeekDotsProps {
  days: { date: string; scored: boolean }[];
  today: string;
}

function weekdayLetter(date: string): string {
  return new Intl.DateTimeFormat('pl-PL', { weekday: 'narrow' }).format(new Date(`${date}T12:00:00`));
}

export default function WeekDots({ days, today }: WeekDotsProps) {
  if (days.length === 0) return null;
  const scoredCount = days.filter(day => day.scored).length;
  return (
    <div role="img" aria-label={`Ocenione dni w ostatnim tygodniu: ${scoredCount} z 7`}
      className="flex items-center justify-between gap-1">
      {days.map(day => (
        <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
          <span className={`h-3 w-3 rounded-full ${day.scored ? 'bg-success' : 'bg-surface-3'} ${day.date === today ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-solid' : ''}`} />
          <span className="text-2xs text-text-muted">{weekdayLetter(day.date)}</span>
        </div>
      ))}
    </div>
  );
}
