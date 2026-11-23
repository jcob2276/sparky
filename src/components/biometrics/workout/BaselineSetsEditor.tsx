import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { rampSets, type SetRow } from '../../../lib/health/baselineRamp';
import { baselineInputClass } from './BaselineVideoCell';

const MAX_SETS = 14;
const toNumber = (text: string): number | null => {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
};
const show = (value: number | null): string => (value == null ? '' : String(value).replace('.', ','));

interface Props {
  sets: SetRow[];
  /** Zapis całej listy (po wyjściu z pola, dodaniu, usunięciu albo podpowiedzi). */
  onCommit: (sets: SetRow[]) => void;
}

/** Serie testu z ciężarem wg trenera: od rozgrzewki bez ciężaru po 100% starego maksa. */
export default function BaselineSetsEditor({ sets, onCommit }: Props) {
  const [rows, setRows] = useState<SetRow[]>(sets);
  const [oldMax, setOldMax] = useState('');
  const suggestion = rampSets(toNumber(oldMax) ?? 0);

  const commit = (next: SetRow[]) => { setRows(next); onCommit(next); };
  const edit = (index: number, patch: Partial<SetRow>) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      <p className="text-2xs font-semibold text-text-muted">Serie: od rozgrzewki do maksa (kg × powtórzenia)</p>
      <ul className="list-none space-y-1.5 p-0">
        {rows.map((row, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-2xs font-semibold tabular-nums text-text-muted">{index + 1}</span>
            <ControlInput className={baselineInputClass} inputMode="decimal" placeholder="kg" aria-label={`Seria ${index + 1}: ciężar`} value={show(row.kg)}
              onChange={(e) => edit(index, { kg: toNumber(e.target.value) })} onBlur={() => onCommit(rows)} />
            <span className="text-text-muted" aria-hidden="true">×</span>
            <ControlInput className={baselineInputClass} inputMode="numeric" placeholder="powt." aria-label={`Seria ${index + 1}: powtórzenia`} value={show(row.reps)}
              onChange={(e) => edit(index, { reps: toNumber(e.target.value) })} onBlur={() => onCommit(rows)} />
            <Button size="sm" variant="ghost" aria-label={`Usuń serię ${index + 1}`} icon={<X size={14} />} onClick={() => commit(rows.filter((_, i) => i !== index))} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        {rows.length < MAX_SETS && <Button size="sm" variant="tonal" icon={<Plus size={14} />} onClick={() => commit([...rows, { kg: null, reps: null }])}>Dodaj serię</Button>}
      </div>
      <div className="flex items-end gap-2 rounded-xl border border-border-custom bg-surface/70 p-2">
        <label className="min-w-0 flex-1 space-y-1 text-2xs font-semibold text-text-muted">Mój stary max (kg)
          <ControlInput className={baselineInputClass} inputMode="decimal" placeholder="np. 40" aria-label="Stary max do podpowiedzi serii" value={oldMax} onChange={(e) => setOldMax(e.target.value)} />
        </label>
        <Button size="sm" variant="tonal" disabled={!suggestion} onClick={() => suggestion && commit(suggestion)}>Podpowiedz serie</Button>
      </div>
    </div>
  );
}
