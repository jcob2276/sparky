import { useStore } from '../../store/useStore';
import { useHoldingEvents, type HoldingEvent } from '../../lib/finance/holdingEventsApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { formatWarsawDate } from '../../lib/date';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';

const LABELS: Record<string, string> = { opening: 'Stan początkowy', purchase: 'Zakup', adjustment: 'Korekta pozycji', removed: 'Usunięcie pozycji' };
const units = (value: number) => value.toLocaleString('pl-PL', { maximumFractionDigits: 8 });

export function HoldingHistoryView({ events }: { events: HoldingEvent[] }) {
  return <ul className="divide-y divide-border-custom/20">
    {events.map(event => <li key={event.id} className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{event.name} <span className="font-normal text-text-muted">· {event.ticker}</span></p>
        <p className="mt-1 text-xs text-text-secondary">{LABELS[event.kind] ?? event.kind} · {formatWarsawDate(event.recorded_at)}</p>
        <p className="mt-1 text-xs tabular-nums text-text-muted">{units(event.quantity_before)} → {units(event.quantity_after)} szt.</p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
        {event.amount_pln == null ? '—' : formatPln(event.amount_pln, 2)}
      </p>
    </li>)}
  </ul>;
}

export function FinanceHoldingHistory() {
  const userId = useStore(state => state.session?.user?.id);
  const query = useHoldingEvents(userId);
  const events = query.data?.pages.flat() ?? [];
  if (!userId) return null;
  return <section className="space-y-2" aria-label="Historia operacji portfela">
    <h2 className="ios-section-title px-1">Operacje portfela</h2>
    <div className="ios-group">
      {query.isLoading ? <Skeleton variant="block" className="h-24" /> : query.isError ?
        <div className="space-y-2 p-4"><p role="alert" className="text-sm text-text-secondary">Nie udało się pobrać historii operacji.</p><Button variant="ghost" size="sm" onClick={() => void query.refetch()}>Spróbuj ponownie</Button></div> : events.length ?
        <HoldingHistoryView events={events} /> : <p className="p-4 text-sm text-text-muted">Historia pojawi się po dodaniu pozycji lub zapisaniu zakupu.</p>}
      {query.hasNextPage && <div className="p-3"><Button variant="ghost" className="w-full" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Ładowanie…' : 'Starsze operacje'}</Button></div>}
    </div>
    <p className="px-1 text-xs leading-relaxed text-text-muted">Rejestr od uruchomienia historii. Stan początkowy i korekty nie są zakupami ani wpłatami. Kwota zakupu dotyczy pozycji, nie wyniku inwestycji.</p>
  </section>;
}
