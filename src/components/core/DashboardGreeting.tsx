import { TIMEZONE } from '../../lib/date';

function warsawHour(now: Date): number {
  const h = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TIMEZONE }).format(now);
  return Number(h) % 24;
}

function greetingFor(now: Date): string {
  const h = warsawHour(now);
  if (h >= 5 && h < 12) return 'Dzień dobry';
  if (h >= 12 && h < 18) return 'Miłego popołudnia';
  if (h >= 18 && h < 23) return 'Dobry wieczór';
  return 'Spokojnej nocy';
}

/** Powitanie nad stosem „Dziś” — jedyny duży tekst ekranu, reszta ma niższą hierarchię. */
export function DashboardGreeting() {
  return (
    <h2 className="px-1 font-display text-2xl font-semibold tracking-tight text-text-primary">
      {greetingFor(new Date())}
    </h2>
  );
}
