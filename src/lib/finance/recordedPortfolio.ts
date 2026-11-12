import { formatWarsawDate } from '../date';
import type { PricePoint, SeriesPoint } from './portfolioHistory';

type Event = { id: string; holding_id: string; ticker: string; recorded_at: string; quantity_after: number; kind: string; amount_pln: number | null };

/** End-of-day position valuations from recorded changes, never today's quantities backfilled. */
export function buildRecordedPortfolio(events: readonly Event[], prices: readonly PricePoint[], today: string, from?: string) {
  const ordered = events.map(event => ({ ...event, day: formatWarsawDate(event.recorded_at) }))
    .filter(event => event.day <= today).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at) || a.id.localeCompare(b.id));
  const firstDay = ordered[0]?.day;
  const byTicker = new Map<string, PricePoint[]>();
  for (const price of prices) {
    if (price.date > today || !Number.isFinite(price.pricePln) || price.pricePln <= 0) continue;
    const list = byTicker.get(price.ticker) ?? [];
    list.push(price);
    byTicker.set(price.ticker, list);
  }
  for (const list of byTicker.values()) list.sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...new Set([...ordered.map(event => event.day), ...prices.map(price => price.date)])]
    .filter(day => firstDay && day >= firstDay && day <= today).sort();
  const positions = new Map<string, { ticker: string; quantity: number }>();
  const points: SeriesPoint[] = [];
  const missing = new Set<string>();
  let cursor = 0;
  for (const date of dates) {
    while (cursor < ordered.length && ordered[cursor].day <= date) {
      const event = ordered[cursor++];
      positions.set(event.holding_id, { ticker: event.ticker, quantity: event.quantity_after });
    }
    let value = 0;
    let complete = true;
    for (const position of positions.values()) {
      if (position.quantity === 0) continue;
      const quote = byTicker.get(position.ticker)?.filter(price => price.date <= date).at(-1);
      if (!quote || !Number.isFinite(position.quantity) || position.quantity < 0) {
        if (!from || date >= from) missing.add(position.ticker);
        complete = false;
      } else value += position.quantity * quote.pricePln;
    }
    if (complete && (!from || date >= from)) points.push({ date, value: Math.round(value * 100) / 100 });
  }
  const start = points[0];
  const end = points.at(-1);
  const changes = start && end ? ordered.filter(event => event.day > start.date && event.day <= end.date) : [];
  const known = changes.every(event => event.kind === 'purchase' && event.amount_pln != null && Number.isFinite(event.amount_pln));
  const purchases = changes.filter(event => event.kind === 'purchase').reduce((sum, event) => sum + (event.amount_pln ?? 0), 0);
  const valuationChange = start && end && points.length > 1 && known && !missing.size
    ? Math.round((end.value - start.value - purchases) * 100) / 100 : null;
  return { points, missing: [...missing], purchases, valuationChange };
}
