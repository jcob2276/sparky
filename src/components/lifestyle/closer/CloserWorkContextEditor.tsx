import { BatteryMedium, Gauge, Save } from 'lucide-react';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { WORK_ENERGY, WORK_PRESSURE, type WorkContext } from '../../../lib/closer/closerWorkContext';
import Button from '../../ui/Button';
import { ControlTextarea } from '../../ui/ControlPrimitives';
import { useCloserWorkDraft } from './useCloserWorkDraft';
interface Props {
  userId: string; date: string; row?: CloserDailyLogRow; saving: boolean; error: boolean;
  onSave: (context: WorkContext) => void;
}
function Rating({ label, labels, value, onChange, disabled }: {
  label: string; labels: string[]; value: number | null; onChange: (value: number | null) => void; disabled: boolean;
}) {
  return <fieldset className="min-w-0 space-y-3" disabled={disabled}>
    <legend className="text-sm font-semibold text-text-primary">{label}</legend>
    <div className="grid grid-cols-5 gap-2">
      {labels.map((text, i) => <Button key={text} aria-label={`${label}: ${i + 1} z 5 — ${text}`} aria-pressed={value === i + 1}
        variant={value === i + 1 ? 'primary' : 'outline'} className="!px-2" onClick={() => onChange(value === i + 1 ? null : i + 1)}>{i + 1}</Button>)}
    </div>
    <p className="text-sm text-text-secondary">{value === null ? 'Jeszcze nie określono' : labels[value - 1]}</p>
  </fieldset>;
}
export default function CloserWorkContextEditor({ userId, date, row, saving, error, onSave }: Props) {
  const { draft, dirty, setDraft } = useCloserWorkDraft(userId, date, row);
  return <section aria-label="Mój kontekst dnia" className="space-y-5">
    <div>
      <h4 className="text-lg font-semibold tracking-tight text-text-primary">Jak Ci się pracowało?</h4>
      <p className="mt-1 text-sm leading-6 text-text-secondary">Wynik to część dnia. Zapisz też warunki, w których pracowałeś.</p>
    </div>
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2"><BatteryMedium size={20} className="text-primary" /><Rating label="Energia w pracy" labels={WORK_ENERGY} value={draft.work_energy} disabled={saving}
        onChange={work_energy => setDraft({ ...draft, work_energy })} /></div>
      <div className="space-y-2"><Gauge size={20} className="text-primary" /><Rating label="Presja w pracy" labels={WORK_PRESSURE} value={draft.work_pressure} disabled={saving}
        onChange={work_pressure => setDraft({ ...draft, work_pressure })} /></div>
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
