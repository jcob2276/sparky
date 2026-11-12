import { RecordedView } from './FinanceRecordedPortfolioView';
import { useMemo, useState } from 'react';
import type { ValuedHolding } from '@vanguard/domain';
import { useStore } from '../../store/useStore';
import { useAllHoldingEvents } from '../../lib/finance/holdingEventsApi';
import { usePortfolioPrices } from '../../lib/finance/portfolioHistoryApi';
import { buildRecordedPortfolio } from '../../lib/finance/recordedPortfolio';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import { HISTORY_RANGES, type HistoryRange } from '../../lib/finance/portfolioHistory';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import { FinancePortfolioChart } from './FinancePortfolioChart';


export function FinanceRecordedPortfolio({ holdings }: { holdings: ValuedHolding[] }) {
  const userId = useStore(state => state.session?.user?.id);
  const [mode, setMode] = useState('recorded');
  const [range, setRange] = useState<HistoryRange>('3M');
  const events = useAllHoldingEvents(userId);
  const tickers = useMemo(() => [...new Set((events.data ?? []).map(event => event.ticker))], [events.data]);
  const prices = usePortfolioPrices(tickers);
  const today = getTodayWarsaw();
  const days = HISTORY_RANGES.find(item => item.key === range)?.days;
  const from = days ? shiftDateStr(today, -days) : undefined;
  const history = useMemo(() => buildRecordedPortfolio(events.data ?? [], prices.data ?? [], today, from), [events.data, prices.data, today, from]);
  if (!userId) return <FinancePortfolioChart holdings={holdings} />;
  return <section className="space-y-3" aria-label="Historia portfela">
    <Tabs active={mode} onChange={setMode} tabs={[{ key: 'recorded', label: 'Historia portfela' }, { key: 'model', label: 'Dzisiejszy skład wstecz' }]} />
    {mode === 'model' ? <FinancePortfolioChart holdings={holdings} /> : <div className="ios-group space-y-4 p-4">
      <Tabs active={range} onChange={key => setRange(key as HistoryRange)} tabs={HISTORY_RANGES.map(({ key, label }) => ({ key, label }))} />
      {events.isLoading || (tickers.length > 0 && prices.isLoading) ? <Skeleton variant="block" className="h-44" /> : events.isError || prices.isError ?
        <div className="space-y-2"><p role="alert" className="text-sm text-text-secondary">Nie udało się pobrać historii portfela.</p><Button variant="ghost" onClick={() => { void events.refetch(); void prices.refetch(); }}>Spróbuj ponownie</Button></div> : <RecordedView history={history} />}
    </div>}
  </section>;
}
