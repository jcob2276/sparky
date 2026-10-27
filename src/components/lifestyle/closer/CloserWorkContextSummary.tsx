import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { hasWorkContext } from '../../../lib/closer/closerWorkContext';
export default function CloserWorkContextSummary({ row, loading, error }: { row?: CloserDailyLogRow | null; loading?: boolean; error?: boolean }) {
  return <section aria-label="Mój kontekst z dnia rozmowy" className="mt-6 space-y-3 border-t border-border-custom pt-5">
    <h3 className="text-base font-semibold text-text-primary">Ty w dniu tej rozmowy</h3>
    {loading ? <p className="text-sm text-text-secondary">Wczytywanie Twojego kontekstu…</p>
      : error ? <p role="alert" className="text-sm text-text-secondary">Nie udało się wczytać kontekstu dnia.</p>
      : !hasWorkContext(row) ? <p className="text-sm leading-6 text-text-secondary">Nie zapisałeś kontekstu tego dnia. Możesz go uzupełnić w panelu dnia.</p>
      : <>
        {row?.notes?.trim() && <p className="whitespace-pre-wrap break-words text-sm leading-7 text-text-primary">{row.notes}</p>}
        <p className="text-xs leading-5 text-text-secondary">Twój zapis dnia. Sam oceniasz, jak wiąże się z tą rozmową.</p>
      </>}
  </section>;
}
