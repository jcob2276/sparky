import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { hasEnteredNumbers } from '../../../lib/closer/closerDayModel';
import { formatPhoneUsageDuration } from '../../../lib/date';
import Button from '../../ui/Button';
interface Props {
  dateStr: string; log?: CloserDailyLogRow; disabled?: boolean;
  recorded?: { calls: number; hours: number };
  onUpdate: (patch: { dials?: number; work_hours?: number; appointments?: number; sales_calls?: number; sales_closed?: number; numbers_entered_at?: string }) => void;
}
export default function CloserDayInputs({ log, onUpdate, disabled = false, recorded }: Props) {
  const counters = [
    { field: 'dials' as const, label: 'Rozmowy odebrane', value: log?.dials ?? 0, floor: 0 },
    { field: 'appointments' as const, label: 'Umówienia', value: log?.appointments ?? 0, floor: 0 },
    { field: 'sales_calls' as const, label: 'Rozmowy sprzedażowe', value: log?.sales_calls ?? 0, floor: recorded?.calls ?? 0 },
    { field: 'sales_closed' as const, label: 'Sprzedaże', value: log?.sales_closed ?? 0, floor: 0 },
  ];
  const hours = Number(log?.work_hours ?? 0);
  return <div className="space-y-4">
    {recorded ? <p className="text-sm leading-6 text-text-secondary">Fathom potwierdza {recorded.calls} nagrań i {formatPhoneUsageDuration(recorded.hours * 60)} tego dnia. Liczby obejmują nagrania oraz Twój większy wpis ręczny; nie sumujemy ich podwójnie.</p> : <p className="text-sm text-text-secondary">Dane Fathom chwilowo niedostępne. Poczekaj na ich wczytanie przed korektą liczb.</p>}
    {!hasEnteredNumbers(log) && <div className="space-y-2">
      <p className="text-sm text-text-secondary">Liczby tego dnia nie są jeszcze potwierdzone. Możesz też świadomie zapisać dzień zerowy.</p>
      <Button variant="outline" disabled={disabled} onClick={() => onUpdate({ numbers_entered_at: new Date().toISOString() })}>Potwierdź liczby dnia</Button>
    </div>}
    <div className="divide-y divide-border-custom">
      {counters.map(counter => <div key={counter.field} className="flex items-center justify-between gap-3 py-3">
        <span className="text-sm text-text-primary">{counter.label}</span>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="outline" aria-label={`Zmniejsz: ${counter.label}`} disabled={disabled || counter.value <= counter.floor}
            onClick={() => onUpdate({ [counter.field]: Math.max(counter.floor, counter.value - 1) })}>−</Button>
          <span className="min-w-6 text-center text-base font-semibold tabular-nums text-text-primary">{counter.value}</span>
          <Button variant="tonal" aria-label={`Zwiększ: ${counter.label}`} disabled={disabled}
            onClick={() => onUpdate({ [counter.field]: counter.value + 1 })}>+</Button>
        </div>
      </div>)}
      <div className="space-y-3 py-3">
        <div className="flex justify-between gap-3 text-sm"><span className="text-text-primary">Czas pracy</span><span className="font-semibold tabular-nums text-text-primary">{formatPhoneUsageDuration(hours * 60)}</span></div>
        <div className="flex flex-wrap gap-2">
          {[-0.5, 0.5, 1, 2].map(delta => <Button key={delta} variant={delta > 0 ? 'tonal' : 'outline'} disabled={disabled || (delta < 0 && hours <= (recorded?.hours ?? 0))}
            aria-label={`${delta > 0 ? 'Dodaj' : 'Odejmij'} ${Math.abs(delta) * 60} minut pracy`}
            onClick={() => onUpdate({ work_hours: Math.max(recorded?.hours ?? 0, Math.round((hours + delta) * 100) / 100) })}>
            {delta > 0 ? '+' : '−'}{formatPhoneUsageDuration(Math.abs(delta) * 60)}
          </Button>)}
        </div>
      </div>
    </div>
  </div>;
}
