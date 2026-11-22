import { PILLARS, type ReviewLadder } from '../../lib/goal/reviewCycle.data';
import ReviewWeekDetail from './ReviewWeekDetail';

/** Bieżący miesiąc sprintu (4 tygodnie): jego cele i temat, a pod nimi cztery tygodnie z tym, co w nich zapisałeś. */
export default function ReviewMonthView({ ladder }: { ladder: ReviewLadder }) {
  const month = ladder.months.find((m) => m.current) ?? ladder.months[0];
  const weeks = ladder.weeks.filter((w) => w.number > (month.number - 1) * 4 && w.number <= month.number * 4);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-2xs font-bold text-text-muted">Cele sprintu</p>
        {PILLARS.map(({ key, label }) => (
          <p key={key} className="text-xs leading-snug text-text-primary">
            <span className="font-bold">{label}:</span> {ladder.goals[key] ?? <span className="italic text-text-muted">brak</span>}
          </p>
        ))}
      </div>

      <ReviewWeekDetail period={month} title={`Miesiąc ${month.number}/3`} />

      <div className="space-y-2">
        <p className="text-2xs font-bold text-text-muted">Tygodnie tego miesiąca</p>
        {weeks.map((w) => (
          <ReviewWeekDetail key={w.weekStart} period={w} title={`Tydzień ${w.number}/12${w.current ? ' · ten przegląd' : ''}`} />
        ))}
      </div>
    </div>
  );
}
