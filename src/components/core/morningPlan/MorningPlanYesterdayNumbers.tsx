/**
 * @component MorningPlanYesterdayNumbers
 * @role Start dnia: wczorajsze liczby sprzedaży (rozmowy odebrane, umówieni, rozmowy sprzedażowe, sprzedaże), opinia i tempo tygodnia.
 * Gdy wczorajszych liczb brakuje, pokazuje ten sam formularz co domknięcie dnia, żeby je uzupełnić.
 */
import { Quote } from 'lucide-react';
import { shiftDateStr } from '../../../lib/date';
import { getWeekStartWarsaw } from '../../../lib/growth/growth';
import {
  hasEnteredNumbers,
  weekPace,
} from '../../../lib/closer/closerDayModel';
import { useCloserTargets } from '../../../lib/closer/closerTargetsApi';
import DataStateNotice from '../DataStateNotice';
import Button from '../../ui/Button';
import Skeleton from '../../ui/Skeleton';
import SalesNumbersFields from '../salesNumbers/SalesNumbersFields';
import { useDaySalesNumbers } from '../salesNumbers/useDaySalesNumbers';
import { useWeekSalesSums } from '../salesNumbers/useWeekSalesSums';

interface Props {
  userId: string;
  planningDate: string;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border-custom/30 bg-surface/50 px-2 py-2 text-center">
      <div className="text-xl font-semibold tabular-nums text-text-primary">{value}</div>
      <div className="text-2xs font-bold tracking-wide text-text-muted">{label}</div>
    </div>
  );
}

export default function MorningPlanYesterdayNumbers({ userId, planningDate }: Props) {
  const yesterday = shiftDateStr(planningDate, -1);
  const day = useDaySalesNumbers(userId, yesterday);
  const week = useWeekSalesSums(userId, getWeekStartWarsaw(planningDate));
  const targets = useCloserTargets(userId);

  if (day.loading) return <Skeleton className="h-28 w-full rounded-2xl" />;
  if (day.loadError) {
    return <DataStateNotice tone="warning" title="Nie udało się wczytać liczb z wczoraj" detail={day.loadError.message} />;
  }

  if (!hasEnteredNumbers(day.row)) {
    return (
      <section className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-4 space-y-3" aria-labelledby="yesterday-missing">
        <div>
          <h3 id="yesterday-missing" className="text-sm font-semibold text-text-primary">Brakuje liczb z wczoraj</h3>
          <p className="text-xs text-text-secondary mt-0.5">Wpisz je teraz, żeby tydzień się zgadzał.</p>
        </div>
        <SalesNumbersFields idPrefix="yesterday" draft={day.draft} onChange={day.patchDraft} disabled={day.saving} />
        <Button onClick={() => void day.save()} disabled={!day.complete} loading={day.saving} className="w-full" size="sm">
          Zapisz wczoraj
        </Button>
      </section>
    );
  }

  const row = day.row!;
  const appointmentsPace = weekPace(week.sums.appointments, targets.appointments, planningDate);
  const callsPace = weekPace(week.sums.salesCalls, targets.salesCalls, planningDate);
  const note = row.notes?.trim();

  return (
    <section className="rounded-2xl border border-border-custom/40 bg-surface/40 p-4 space-y-3" aria-labelledby="yesterday-numbers">
      <h3 id="yesterday-numbers" className="text-xs font-semibold tracking-wide text-text-muted">Wczoraj</h3>
      <div className="grid grid-cols-4 gap-2">
        <Stat value={row.dials ?? 0} label="Odebrane" />
        <Stat value={row.appointments ?? 0} label="Umówieni" />
        <Stat value={row.sales_calls ?? 0} label="Rozmowy sprz." />
        <Stat value={row.sales_closed ?? 0} label="Sprzedaże" />
      </div>
      {note && (
        <p className="flex items-start gap-2 text-sm text-text-secondary leading-snug">
          <Quote size={13} className="mt-1 shrink-0 text-text-muted" aria-hidden="true" />
          {note}
        </p>
      )}
      <p className="text-xs font-semibold text-text-primary border-t border-border-custom/20 pt-2.5">
        Tydzień: umówieni {week.sums.appointments}/{targets.appointments}, sales calle {week.sums.salesCalls}/{targets.salesCalls}.
        {appointmentsPace.remaining + callsPace.remaining > 0
          ? ` Dziś potrzeba około ${appointmentsPace.perDay} umówień i ${callsPace.perDay} sales calli.`
          : ' Cele tygodnia zrobione.'}
      </p>
    </section>
  );
}
