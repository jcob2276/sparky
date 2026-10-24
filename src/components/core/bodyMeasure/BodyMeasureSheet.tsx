import { useState } from 'react';
import Sheet from '../../ui/Sheet';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { notify } from '../../../lib/notify';
import { MEASURE_GUIDES, type MeasureKey } from '../../../lib/health/measureGuides';
import type { BodyEntryInput } from '../../../lib/health/bodyRemindersApi';
import type { BodyReminderKind } from '../../../lib/health/bodyReminders';
import MeasureHelp from './MeasureHelp';

const FIELDS_FOR: Record<BodyReminderKind, MeasureKey[]> = {
  weight: ['weight', 'waist'],
  tape: ['chest', 'belly', 'hips', 'neck', 'biceps_l', 'thigh', 'calf'],
};
const TITLE: Record<BodyReminderKind, string> = { weight: 'Waga i talia', tape: 'Obwody ciała' };
const EMPTY: BodyEntryInput = { weight: '', waist: '', neck: '', chest: '', belly: '', hips: '', thigh: '', biceps_l: '', calf: '' };

interface Props {
  kind: BodyReminderKind | null;
  onClose: () => void;
  onSave: (input: BodyEntryInput) => Promise<boolean>;
}

/** Szybki wpis pomiarów prosto z ekranu Dziś; przy każdym polu znak „?” pokazuje, gdzie dokładnie mierzyć. */
export default function BodyMeasureSheet({ kind, onClose, onSave }: Props) {
  const [values, setValues] = useState<BodyEntryInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const keys = kind ? FIELDS_FOR[kind] : [];
  const filled = keys.some((key) => values[key].trim() !== '');

  const close = () => { setValues(EMPTY); onClose(); };
  const save = async () => {
    setSaving(true);
    try {
      if (await onSave(values)) {
        notify('Zapisano pomiar.', 'success');
        close();
      } else {
        notify('Podaj przynajmniej jeden pomiar.', 'error');
      }
    } catch {
      notify('Nie udało się zapisać pomiaru.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={kind !== null} onOpenChange={(open) => { if (!open) close(); }} title={kind ? TITLE[kind] : ''} side="bottom" compact>
      <div className="space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {keys.map((key) => (
            <div key={key} className="space-y-1">
              <span className="flex items-center gap-1 text-2xs font-bold tracking-wide text-text-muted">
                {MEASURE_GUIDES[key].label} <MeasureHelp measure={key} />
              </span>
              <div className="relative">
                <ControlInput
                  type="text"
                  inputMode="decimal"
                  value={values[key]}
                  onChange={(event) => setValues((prev) => ({ ...prev, [key]: event.target.value.replace(',', '.') }))}
                  placeholder="--"
                  className="w-full rounded-xl border border-border-custom bg-surface px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary/50"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-text-muted">{key === 'weight' ? 'kg' : 'cm'}</span>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => void save()} disabled={!filled || saving} className="w-full">
          {saving ? 'Zapisuję…' : 'Zapisz'}
        </Button>
      </div>
    </Sheet>
  );
}
