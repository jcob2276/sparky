import { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { ControlInput, ControlSelect, ControlTextarea } from '../../ui/ControlPrimitives';
import type { PracticeCompetenceLevel, PracticeEvidence } from '../../../lib/growth/growth.types';
import { savePracticeEvidences } from '../../../lib/growth/growthApi';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';

interface Props {
  userId: string;
  practiceEvidences: PracticeEvidence[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddPracticeEvidenceModal({
  userId,
  practiceEvidences,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<PracticeCompetenceLevel>('can_do');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!title.trim()) {
      notify('Podaj nazwę wdrożonej praktyki.', 'error');
      return;
    }

    setSaving(true);
    try {
      const newEvidence: PracticeEvidence = {
        id: crypto.randomUUID(),
        title: title.trim(),
        competenceLevel: level,
        details: details.trim(),
        date: getTodayWarsaw(),
      };

      const updated = [newEvidence, ...practiceEvidences];
      await savePracticeEvidences(userId, updated);
      notify('Dowód wdrożenia zapisany.', 'success');
      onSaved();
      onClose();
      // Reset
      setTitle('');
      setLevel('can_do');
      setDetails('');
    } catch {
      notify('Nie udało się zapisać dowodu wdrożenia.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zaloguj Dowód Wdrożenia">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Co wdrożyłeś w praktyce?
          </label>
          <ControlInput
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Zbudowałem pipeline z walidacją schema zamiast surowego promptu"
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Poziom opanowania
          </label>
          <ControlSelect
            value={level}
            onChange={(e) => setLevel(e.target.value as PracticeCompetenceLevel)}
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          >
            <option value="try">Przetestowane (Pierwsza próba)</option>
            <option value="can_do">Potrafię wdrożyć (Samodzielnie działające)</option>
            <option value="apply_regularly">Stosuję regularnie (Nowy nawyk/standard)</option>
          </ControlSelect>
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Szczegóły / Kontekst
          </label>
          <ControlTextarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Jaki był efekt, co zadziałało, jaki był wynik w projekcie..."
            rows={3}
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2 text-sm font-semibold text-text-primary focus:border-primary outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button variant="primary" onClick={() => void handleAdd()} disabled={saving}>Zaloguj</Button>
        </div>
      </div>
    </Modal>
  );
}
