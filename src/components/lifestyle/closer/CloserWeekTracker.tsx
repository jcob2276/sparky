import { Card } from '../../ui/Card';
import Spinner from '../../ui/Spinner';
import DataStateNotice from '../../core/DataStateNotice';
import { formatLongDateWarsaw, formatWeekdayWarsaw, formatWeekRange } from '../../../lib/date';
import { useCloserWeek } from './useCloserWeek';
import CloserWeekSummary from './CloserWeekSummary';
import CloserDayStrip from './CloserDayStrip';
import CloserDayInputs from './CloserDayInputs';
import CloserCallsList from './CloserCallsList';
import CloserWorkContextEditor from './CloserWorkContextEditor';
interface Props { userId: string; weekStart: string; projectName?: string; isFocusSprint?: boolean }
export default function CloserWeekTracker(props: Props) {
  const model = useCloserWeek(props.userId, props.weekStart);
  return <CloserWeekView {...props} model={model} />;
}
function CloserWeekView({ userId, weekStart, projectName = 'Closer', isFocusSprint, model }: Props & { model: ReturnType<typeof useCloserWeek> }) {
  const { logs, selectedDate, selectDate, targets, numbers, context } = model;
  const rows = logs.data ?? [];
  const logsByDate = Object.fromEntries(rows.map(row => [row.date, row]));
  const current = logsByDate[selectedDate];
  return <Card padding="1.25rem" className="space-y-7 sm:!p-7">
    <header className="space-y-2">
      <p className="text-sm font-medium text-primary">Twoja praca · {formatWeekRange(weekStart)}</p>
      <h3 className="break-words text-xl font-semibold tracking-tight text-text-primary">{projectName}</h3>
      <a href={"#closer-library-" + weekStart} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Przejdź do biblioteki rozmów</a>
      {isFocusSprint && <p className="text-sm text-text-secondary">Focus sprintu</p>}
    </header>
    {logs.isPending ? <div className="flex items-center gap-3 py-5 text-sm text-text-secondary"><Spinner size="sm" /> Wczytywanie tygodnia…</div>
      : logs.isError ? <DataStateNotice tone="warning" title="Nie udało się wczytać tygodnia" detail="Odśwież widok i spróbuj ponownie." />
      : <>
        <CloserWeekSummary logs={rows} targets={targets} />
        <section className="space-y-5 border-t border-border-custom pt-6" aria-label="Mój dzień pracy">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Twój dzień</h3>
            <p className="mt-1 text-sm text-text-secondary">Wybierz dzień, żeby wrócić do jego liczb i kontekstu.</p>
          </div>
          <CloserDayStrip weekStart={weekStart} selectedDate={selectedDate} onSelectDate={selectDate} logsByDate={logsByDate} />
          <p className="text-sm font-medium capitalize text-text-primary">{formatWeekdayWarsaw(selectedDate)} · {formatLongDateWarsaw(selectedDate)}</p>
          <CloserWorkContextEditor key={userId + selectedDate} userId={userId} date={selectedDate} row={current}
            saving={context.isPending} error={context.isError && context.variables?.date === selectedDate}
            onSave={value => context.mutate({ date: selectedDate, value })} />
          <details className="border-t border-border-custom pt-4">
            <summary className="cursor-pointer py-2 text-sm font-semibold text-primary">Liczby dnia i ręczne korekty</summary>
            <div className="pt-4">
              <CloserDayInputs dateStr={selectedDate} log={current} disabled={numbers.isPending || !model.libraryReady} recorded={model.libraryReady ? model.recorded : undefined}
                onUpdate={patch => numbers.mutate({ date: selectedDate, patch: { date: selectedDate, ...patch } })} />
              {numbers.isError && numbers.variables?.date === selectedDate && <p role="alert" className="mt-3 text-sm text-danger">Nie udało się zapisać liczb. Spróbuj ponownie.</p>}
            </div>
          </details>
        </section>
      </>}
    <CloserCallsList userId={userId} date={selectedDate} weekStart={weekStart} />
  </Card>;
}
