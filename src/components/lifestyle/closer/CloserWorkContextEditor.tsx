import { Save } from 'lucide-react';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import type { WorkContext } from '../../../lib/closer/closerWorkContext';
import Button from '../../ui/Button';
import { ControlTextarea } from '../../ui/ControlPrimitives';
import { useCloserWorkDraft } from './useCloserWorkDraft';
interface Props {
  userId: string; date: string; row?: CloserDailyLogRow; saving: boolean; error: boolean;
  onSave: (context: WorkContext) => void;
}
export default function CloserWorkContextEditor({ userId, date, row, saving, error, onSave }: Props) {
  const { draft, dirty, setDraft } = useCloserWorkDraft(userId, date, row);
  return <section aria-label="Mój kontekst dnia" className="space-y-5">
    <div>
      <h4 className="text-lg font-semibold tracking-tight text-text-primary">Jak Ci się pracowało?</h4>
      <p className="mt-1 text-sm leading-6 text-text-secondary">Wynik to część dnia. Zapisz też warunki, w których pracowałeś.</p>
    </div>
    <div className="space-y-2">
      <label htmlFor="closer-day-context" className="block text-sm font-semibold text-text-primary">Co miało znaczenie tego dnia?</label>
      <ControlTextarea id="closer-day-context" value={draft.notes} maxLength={10000} rows={3} disabled={saving}
        onChange={event => setDraft({ ...draft, notes: event.target.value })}
        placeholder="Np. mało snu, presja wyniku, trudna rozmowa albo coś, co pomogło mi wrócić do skupienia."
        className="w-full resize-y rounded-[var(--radius-md)] border border-border-custom bg-surface-2 p-4 text-base leading-7 text-text-primary" />
    </div>
    {error && <p role="alert" className="text-sm text-danger">Nie udało się zapisać. Szkic został na tym urządzeniu — spróbuj ponownie.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-xs leading-5 text-text-secondary">{saving ? 'Zapisywanie…' : dirty ? 'Szkic na tym urządzeniu · zapisz, by widzieć go przy rozmowach' : 'Twój opis dnia · widoczny także przy analizie rozmów'}</p>
      <Button icon={<Save size={16} />} disabled={!dirty} loading={saving} onClick={() => onSave(draft)}>Zapisz kontekst</Button>
    </div>
  </section>;
}
