import { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import type { SparkyIdentityData } from '../../../lib/growth/growth.types';
import { updateSparkyIdentity } from '../../../lib/growth/growthApi';
import { notify } from '../../../lib/notify';

interface Props {
  userId: string;
  identity: SparkyIdentityData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditThemeModal({ userId, identity, isOpen, onClose, onSaved }: Props) {
  const [theme, setTheme] = useState(identity?.development_theme || '');
  const [gap, setGap] = useState(identity?.development_gap || '');
  const [role, setRole] = useState(identity?.developed_role || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSparkyIdentity(userId, {
        development_theme: theme.trim() || null,
        development_gap: gap.trim() || null,
        developed_role: role.trim() || null,
      });
      notify('Kompas rozwoju zaktualizowany.', 'success');
      onSaved();
      onClose();
    } catch {
      notify('Nie udało się zapisać zmian.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edytuj Kompas Rozwoju">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Główny Motyw Rozwoju
          </label>
          <ControlInput
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="np. Architektura LLM & Systemy Agentowe"
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Luka Kompetencyjna (Co Cię blokuje?)
          </label>
          <ControlInput
            type="text"
            value={gap}
            onChange={(e) => setGap(e.target.value)}
            placeholder="np. Przejście z testów promptów do produkcyjnego kodu"
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Docelowa Rola / Standard
          </label>
          <ControlInput
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="np. Senior Staff AI Engineer"
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>Zapisz</Button>
        </div>
      </div>
    </Modal>
  );
}
