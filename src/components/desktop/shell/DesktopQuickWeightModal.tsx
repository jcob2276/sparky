import { useState } from 'react';
import { Scale } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { logWeightMetric } from '../../../lib/health/bodyMetricsApi';
import { notify } from '../../../lib/notify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  currentWeight?: number | null;
  onSaved?: () => void;
}

export default function DesktopQuickWeightModal({
  isOpen,
  onClose,
  userId,
  currentWeight,
  onSaved,
}: Props) {
  const [weightStr, setWeightStr] = useState(currentWeight != null ? String(currentWeight) : '');
  const [saving, setSaving] = useState(false);

  const adjustWeight = (delta: number) => {
    const current = Number(weightStr) || currentWeight || 75.0;
    const next = +(current + delta).toFixed(1);
    if (next > 30 && next < 300) {
      setWeightStr(String(next));
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    const val = Number(weightStr.replace(',', '.'));
    if (!Number.isFinite(val) || val < 30 || val > 300) {
      notify('Podaj prawidłową wagę w kg (np. 76.2)', 'error');
      return;
    }
    setSaving(true);
    try {
      await logWeightMetric(userId, val);
      notify(`Zapisano wagę: ${val.toFixed(1)} kg`, 'success');
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nieznany błąd';
      notify(`Błąd zapisu wagi: ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-primary" />
          <span>Wpis Wagi</span>
        </div>
      }
      subtitle="Bieżąca masa ciała dla kompozycji sylwetki i bilansu sprintu."
      size="sm"
    >
      <div className="space-y-5 pt-1">
        {currentWeight != null && (
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>Ostatnio zapisana:</span>
            <span className="font-bold text-text-primary font-mono">{currentWeight.toFixed(1)} kg</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex items-baseline justify-center gap-2">
            <ControlInput
              autoFocus
              type="number"
              step="0.1"
              min="30"
              max="300"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
              placeholder="0.0"
              className="w-36 text-center font-display text-4xl font-black text-text-primary rounded-2xl border border-border-custom bg-surface py-2 font-mono outline-none focus:border-primary shadow-xs"
            />
            <span className="text-sm font-bold text-text-muted uppercase">kg</span>
          </div>

          <div className="flex items-center gap-1.5 pt-2">
            {[-0.5, -0.2, 0.2, 0.5].map((d) => (
              <Pressable
                key={d}
                variant="ghost"
                size="sm"
                onClick={() => adjustWeight(d)}
                className="px-2.5 py-1 text-2xs font-bold rounded-lg border border-border-custom/60 hover:border-primary/40 hover:bg-primary/5 text-text-secondary font-mono"
              >
                {d > 0 ? `+${d}` : d}
              </Pressable>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Anuluj
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz wagę'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}