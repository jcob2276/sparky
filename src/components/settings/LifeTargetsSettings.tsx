import { Target } from 'lucide-react';
import { useState } from 'react';
import { useLifeTargets, useSaveLifeTargets } from '../../lib/lifeTargetsApi';
import { notify } from '../../lib/notify';
import Button from '../ui/Button';
import { ControlInput } from '../ui/ControlPrimitives';
import SettingsSection from './SettingsSection';

const INPUT_CLASS = 'w-full rounded-xl border border-border-custom bg-surface-solid px-3 py-2.5 text-sm';

/** Cele wyciskania i dochodu (właściciel: `life_targets`); cel tłuszczu zmieniasz w profilu żywieniowym. */
export default function LifeTargetsSettings({ userId }: { userId: string }) {
  const targets = useLifeTargets(userId);
  const save = useSaveLifeTargets(userId);
  const [draft, setDraft] = useState<{ bench: string; income: string } | null>(null);
  const bench = draft?.bench ?? String(targets.benchKg);
  const income = draft?.income ?? String(targets.incomeNetPln);
  const benchKg = Number(bench.replace(',', '.'));
  const incomeNetPln = Number(income.replace(',', '.'));
  const valid = Number.isFinite(benchKg) && benchKg > 0 && Number.isFinite(incomeNetPln) && incomeNetPln > 0;

  const submit = async () => {
    try {
      await save.mutateAsync({ benchKg, incomeNetPln });
      setDraft(null);
      notify('Zapisano cele.', 'success');
    } catch {
      notify('Nie udało się zapisać celów.', 'error');
    }
  };

  return (
    <SettingsSection icon={<Target size={16} />} title="Cele liczbowe" description="Jedno źródło dla kart sfer, Kroniki i prognoz. Cel tłuszczu ustawiasz w profilu żywieniowym.">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-muted block mb-1 font-medium">Cel wyciskania (kg, e1RM)</label>
          <ControlInput type="number" inputMode="decimal" step="0.5" value={bench} onChange={(e) => setDraft({ bench: e.target.value, income })} className={INPUT_CLASS} />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1 font-medium">Cel dochodu netto (zł/msc)</label>
          <ControlInput type="number" inputMode="numeric" step="500" value={income} onChange={(e) => setDraft({ bench, income: e.target.value })} className={INPUT_CLASS} />
        </div>
      </div>
      <Button onClick={() => void submit()} disabled={!draft || !valid || save.isPending}>Zapisz cele</Button>
    </SettingsSection>
  );
}
