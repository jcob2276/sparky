import { useMemo, useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { notify } from '../../../lib/notify';
import { getTodayWarsaw } from '../../../lib/date';
import {
  computeLabFlag,
  deriveMarkerKey,
  type MarkerSeries,
} from '../../../lib/health/medicalAnalytics';
import { ControlInput } from '../../ui/ControlPrimitives';
import { MedicalImportReviewStep } from './MedicalImportSteps';

export interface ImportedMedicalResult {
  marker_key: string;
  marker_name: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  flag: 'L' | 'H' | 'N';
  category: string | null;
}

export interface LabResultEntryMeta {
  docName: string;
  resultDate: string;
  provider: string;
}

interface MedicalImportProps {
  isOpen: boolean;
  onClose: () => void;
  series: MarkerSeries[];
  onConfirmImport: (results: ImportedMedicalResult[], meta: LabResultEntryMeta) => Promise<void>;
}

type Step = 'entry' | 'review';

interface EntryRow {
  localId: string;
  markerName: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  category: string;
}

const EMPTY_ROW = (): EntryRow => ({
  localId: crypto.randomUUID(),
  markerName: '',
  value: '',
  unit: '',
  refLow: '',
  refHigh: '',
  category: '',
});

// eslint-disable-next-line max-lines-per-function
export default function MedicalImport({ isOpen, onClose, series, onConfirmImport }: MedicalImportProps) {
  const [step, setStep] = useState<Step>('entry');
  const [resultDate, setResultDate] = useState(getTodayWarsaw());
  const [docName, setDocName] = useState('');
  const [provider, setProvider] = useState('');
  const [rows, setRows] = useState<EntryRow[]>([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);

  // Nazwa (małymi literami) → istniejący marker_key, żeby ręczny wpis spinał się z trendem.
  const existingByName = useMemo(
    () => new Map(series.map((s) => [s.marker_name.trim().toLowerCase(), s.marker_key])),
    [series],
  );

  const patchRow = (localId: string, patch: Partial<EntryRow>) =>
    setRows((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));

  const removeRow = (localId: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.localId !== localId) : prev));

  const toNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const validRows = rows.filter((row) => row.markerName.trim() !== '' && toNumber(row.value) !== null);

  const handleSave = async () => {
    const results: ImportedMedicalResult[] = validRows.map((row) => {
      const value = toNumber(row.value)!;
      const refLow = toNumber(row.refLow);
      const refHigh = toNumber(row.refHigh);
      return {
        marker_key: deriveMarkerKey(row.markerName, existingByName),
        marker_name: row.markerName.trim(),
        value,
        unit: row.unit.trim() || '',
        ref_low: refLow,
        ref_high: refHigh,
        flag: computeLabFlag(value, refLow, refHigh),
        category: row.category.trim() || null,
      };
    });

    const meta: LabResultEntryMeta = {
      docName: docName.trim() || 'Ręczny wpis wyników',
      resultDate,
      provider: provider.trim() || 'Ręczny wpis',
    };

    setSaving(true);
    try {
      await onConfirmImport(results, meta);
      notify('Wyniki zostały zapisane w Kartotece.', 'success');
      setStep('entry');
      setRows([EMPTY_ROW()]);
      setDocName('');
      setProvider('');
      onClose();
    } catch {
      notify('Wystąpił błąd podczas zapisu wyników.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setStep('entry');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Dodaj wyniki badań">
      <div className="space-y-6 py-2">
        {step === 'entry' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="text-2xs font-black uppercase text-text-muted">Data wyniku</span>
                <ControlInput
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                  className="w-full bg-background/50 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-1">
                <span className="text-2xs font-black uppercase text-text-muted">Dokument / źródło</span>
                <ControlInput
                  type="text"
                  placeholder="np. Morfologia — Diagnostyka"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-background/50 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-1">
                <span className="text-2xs font-black uppercase text-text-muted">Laboratorium</span>
                <ControlInput
                  type="text"
                  placeholder="np. Diagnostyka"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-background/50 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.localId} className="grid grid-cols-[1fr_5.5rem_5rem] sm:grid-cols-[1.4fr_6rem_5.5rem_5rem_5rem_1fr_auto] gap-2 items-center rounded-xl border border-border-custom bg-background/40 p-2">
                  <ControlInput
                    type="text"
                    placeholder="Nazwa markera (np. Ferrytyna)"
                    value={row.markerName}
                    onChange={(e) => patchRow(row.localId, { markerName: e.target.value })}
                    className="w-full bg-background/60 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <ControlInput
                    type="number"
                    step="any"
                    placeholder="Wartość"
                    value={row.value}
                    onChange={(e) => patchRow(row.localId, { value: e.target.value })}
                    className="w-full bg-background/60 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <ControlInput
                    type="text"
                    placeholder="Jedn."
                    value={row.unit}
                    onChange={(e) => patchRow(row.localId, { unit: e.target.value })}
                    className="w-full bg-background/60 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <ControlInput
                    type="number"
                    step="any"
                    placeholder="Dolna norma"
                    value={row.refLow}
                    onChange={(e) => patchRow(row.localId, { refLow: e.target.value })}
                    className="hidden sm:block w-full bg-background/60 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <ControlInput
                    type="number"
                    step="any"
                    placeholder="Górna norma"
                    value={row.refHigh}
                    onChange={(e) => patchRow(row.localId, { refHigh: e.target.value })}
                    className="hidden sm:block w-full bg-background/60 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <ControlInput
                    type="text"
                    placeholder="Kategoria (opcj.)"
                    value={row.category}
                    onChange={(e) => patchRow(row.localId, { category: e.target.value })}
                    className="hidden sm:block w-full bg-background/60 border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Usuń wiersz"
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(row.localId)}
                    className="text-text-muted"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setRows((prev) => [...prev, EMPTY_ROW()])}>
                <Plus size={12} /> Dodaj marker
              </Button>
              <Button variant="outline" size="sm" disabled={validRows.length === 0} onClick={() => setStep('review')}>
                Weryfikacja ({validRows.length})
              </Button>
            </div>
          </>
        )}

        {step === 'review' && (
          <MedicalImportReviewStep
            resultDate={resultDate}
            rows={validRows.map((row) => ({
              markerName: row.markerName.trim(),
              value: toNumber(row.value)!,
              unit: row.unit.trim(),
              refLow: toNumber(row.refLow),
              refHigh: toNumber(row.refHigh),
              flag: computeLabFlag(toNumber(row.value)!, toNumber(row.refLow), toNumber(row.refHigh)),
              delta: (() => {
                const key = deriveMarkerKey(row.markerName, existingByName);
                const prior = series.find((s) => s.marker_key === key)?.latest.value;
                return prior == null ? null : toNumber(row.value)! - prior;
              })(),
            }))}
            onBack={() => setStep('entry')}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>
    </Modal>
  );
}
