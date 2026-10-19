import { useCallback, useMemo } from 'react';
import { Coffee } from 'lucide-react';
import {
  buildIntakeInsights,
  type CoffeeWindow,
  type IntakeNight,
  type TodayStackItem,
} from '../../../lib/biometrics/ouraIntakeInsights';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { useCaffeineEntries } from '../../../lib/health/caffeineHistoryApi';
import { notify } from '../../../lib/notify';
import { buildQuickLog, useQuickLogSupplement } from '../../../lib/health/supplementQuickLogApi';
import { useSupplementLogs, useSupplements } from '../../../lib/health/supplementsApi';
import type { OuraHealthHubData } from './types';
import { CaffeineImpacts } from './OuraIntakeImpacts';
import { ComparisonCard } from './OuraIntakeParts';
import { TodayStrip } from './OuraIntakeToday';

interface OuraIntakeSectionProps {
  userId: string;
  data: OuraHealthHubData;
}

function collectNights(data: OuraHealthHubData): IntakeNight[] {
  const byDate = new Map<string, IntakeNight>();
  for (const row of [...(data.ouraHistory ?? []), ...(data.oura ? [data.oura] : [])]) byDate.set(row.date, row);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function windowText(w: CoffeeWindow): { headline: string; detail: string } {
  if (w.status === 'recommendation') {
    return {
      headline: `Ostatnia kawa najpóźniej ${w.beforeHours} h przed snem${w.latestClock ? ` (ok. ${w.latestClock})` : ''}`,
      detail: `W Twoich danych noce z kawą wcześniej niż ${w.beforeHours} h przed snem mają średnio o ${w.scoreGap} pkt wyższy wynik snu `
        + `(${w.nFar} vs ${w.nNear} nocy). Wybrano najlepszy z progów 4, 6, 8 i 10 h, więc to korelacja, nie dowód.`,
    };
  }
  if (w.status === 'no_effect') {
    return {
      headline: 'Brak wyraźnej różnicy',
      detail: 'Przy żadnym progu odstępu (4, 6, 8, 10 h) wynik snu nie różni się o 3 pkt lub więcej. Nie ma podstaw, by zalecać limit.',
    };
  }
  return {
    headline: 'Brak danych',
    detail: 'Za mało nocy z kawą blisko snu i wcześniej, żeby wyliczyć okno. Loguj kawę z godziną.',
  };
}

export function OuraIntakeSection({ userId, data }: OuraIntakeSectionProps) {
  const today = data.date ?? getTodayWarsaw();
  const nights = useMemo(() => collectNights(data), [data]);
  const since = nights[0]?.date ?? shiftDateStr(today, -30);
  const supplementsQuery = useSupplements(userId);
  const logsQuery = useSupplementLogs(userId, since);
  const caffeineQuery = useCaffeineEntries(userId, since);

  const insights = useMemo(
    () => buildIntakeInsights({
      today,
      nights,
      supplements: supplementsQuery.data ?? [],
      supplementLogs: logsQuery.data ?? [],
      caffeineEntries: caffeineQuery.data ?? [],
    }),
    [today, nights, supplementsQuery.data, logsQuery.data, caffeineQuery.data],
  );

  const quickLog = useQuickLogSupplement(userId, since);
  const pendingIds = useMemo<ReadonlySet<string>>(
    () => new Set(quickLog.isPending && quickLog.variables
      ? [quickLog.variables.kind === 'log' ? quickLog.variables.log.supplement_id : quickLog.variables.supplementId]
      : []),
    [quickLog.isPending, quickLog.variables],
  );
  const toggleSupplement = useCallback((item: TodayStackItem) => {
    if (item.taken && item.logId) {
      quickLog.mutate({ kind: 'unlog', logId: item.logId, supplementId: item.id });
      return;
    }
    const log = buildQuickLog(userId, item.id, today);
    quickLog.mutate({ kind: 'log', log }, {
      onSuccess: () => notify(`Zaznaczono: ${item.name}`, 'success', {
        action: { label: 'Cofnij', onClick: () => quickLog.mutate({ kind: 'unlog', logId: log.id, supplementId: item.id }) },
      }),
    });
  }, [quickLog, userId, today]);

  const loading = supplementsQuery.isLoading || logsQuery.isLoading || caffeineQuery.isLoading;
  const failed = supplementsQuery.isError || logsQuery.isError || caffeineQuery.isError;
  const hasAnything = (supplementsQuery.data?.length ?? 0) > 0 || (caffeineQuery.data?.length ?? 0) > 0;
  const { headline, detail } = windowText(insights.coffeeWindow);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-light text-text-primary">Kawa i suple</h2>
        <p className="mt-1 text-sm text-text-muted">
          Kiedy pijesz kawę, kiedy bierzesz suple i jak wygląda po nich sen. To korelacje z ostatnich {nights.length} nocy, nie dowody.
        </p>
      </div>

      {loading && <p className="text-sm text-text-muted">Wczytuję kawę i suple...</p>}
      {failed && <p className="text-sm text-warning">Nie udało się odczytać części danych o kawie lub suplach.</p>}

      {!loading && !failed && !hasAnything ? (
        <div className="rounded-xl border border-border-custom bg-surface-2 p-5">
          <p className="text-sm text-text-secondary">Brak zapisanej kawy i suplementów.</p>
          <p className="mt-1 text-xs text-text-muted">Zapisuj kawę w dzienniku jedzenia (z godziną) i zaznaczaj suple, a pojawią się tu porównania ze snem.</p>
        </div>
      ) : !loading && (
        <>
          <TodayStrip
            caffeineTimes={insights.todayCaffeineTimes}
            stack={insights.todayStack}
            pendingIds={pendingIds}
            error={quickLog.isError ? 'Nie udało się zapisać suplementu. Spróbuj ponownie.' : null}
            onToggle={toggleSupplement}
          />

          <article className="rounded-xl border border-border-custom bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Coffee size={16} strokeWidth={1.8} className="text-warning" /> Okno ostatniej kawy
            </div>
            <p className="mt-3 text-2xl font-light text-text-primary">{headline}</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">{detail}</p>
          </article>

          <CaffeineImpacts caffeine={insights.caffeine} />

          <div className="grid gap-3 sm:grid-cols-2">
            {insights.supplements.map((s) => (
              <ComparisonCard
                key={s.id}
                title={s.name}
                subtitle={s.typicalTime ? `Zwykle o ${s.typicalTime} · noc po dniu z/bez` : 'Noc po dniu z/bez suplementu'}
                withLabel="Z suplem"
                withoutLabel="Bez"
                comparison={s.comparison}
                progressVerb="Zaznaczone"
                hint="Zaznaczaj regularnie, a po 5 nocach zobaczysz porównanie."
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
