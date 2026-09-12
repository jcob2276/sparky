import { Check, ChevronLeft } from 'lucide-react';
import Button from '../../ui/Button';

export interface MedicalImportReviewRow {
  markerName: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flag: 'L' | 'H' | 'N';
  /** Różnica względem ostatniego zapisanego pomiaru tego markeru; null gdy brak historii. */
  delta: number | null;
}

const FLAG_LABEL: Record<MedicalImportReviewRow['flag'], string> = {
  L: 'Poniżej normy',
  H: 'Powyżej normy',
  N: 'W normie',
};

const FLAG_CLASS: Record<MedicalImportReviewRow['flag'], string> = {
  L: 'bg-warning/10 text-warning',
  H: 'bg-danger/10 text-danger',
  N: 'bg-success/10 text-success',
};

export function MedicalImportReviewStep({ resultDate, rows, onBack, onSave, saving }: {
  resultDate: string;
  rows: MedicalImportReviewRow[];
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-custom pb-2">
        <span className="text-xs font-bold">Weryfikacja przed zapisem · {resultDate}</span>
        <span className="rounded bg-primary/10 px-2 py-0.5 text-3xs font-black uppercase text-primary">
          {rows.length} {rows.length === 1 ? 'marker' : 'markery'}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-text-muted">
        Flagi wynikają z podanych norm laboratoryjnych. Delta pokazuje zmianę względem ostatniego zapisanego pomiaru tego samego markeru.
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div key={row.markerName} className="flex items-center justify-between gap-3 rounded-xl border border-border-custom bg-background/40 p-3">
            <div>
              <h4 className="text-xs font-bold text-text-primary">{row.markerName}</h4>
              <span className="font-mono text-3xs text-text-muted">
                {row.value} {row.unit}
                {row.refLow != null && row.refHigh != null && ` (norma: ${row.refLow}–${row.refHigh})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {row.delta != null && (
                <span className={`text-2xs font-bold ${row.delta > 0 ? 'text-primary' : row.delta < 0 ? 'text-text-muted' : 'text-text-secondary'}`}>
                  {row.delta > 0 ? '+' : ''}{Math.abs(row.delta) < 0.01 ? row.delta.toFixed(3) : row.delta.toFixed(1)} {row.unit}
                </span>
              )}
              <span className={`rounded px-2 py-0.5 text-3xs font-black uppercase ${FLAG_CLASS[row.flag]}`}>
                {FLAG_LABEL[row.flag]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          <ChevronLeft size={12} /> Wstecz
        </Button>
        <Button variant="outline" onClick={onSave} disabled={saving}>
          <Check size={12} /> {saving ? 'Zapisywanie…' : 'Zapisz w Kartotece'}
        </Button>
      </div>
    </div>
  );
}
