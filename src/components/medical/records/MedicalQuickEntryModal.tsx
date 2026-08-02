import { useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { parseMedicalEntry, type MedicalEventDraft } from '../../../lib/health/medicalRecords';

interface MedicalQuickEntryModalProps {
  isOpen: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: MedicalEventDraft) => void;
}

export default function MedicalQuickEntryModal({
  isOpen,
  saving,
  onClose,
  onSave,
}: MedicalQuickEntryModalProps) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<MedicalEventDraft | null>(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dodaj do Kartoteki"
      subtitle="Faktyczne zdarzenie"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-text-secondary">
          Napisz krótko, co się wydarzyło. Sparky przygotuje wpis, a Ty zatwierdzisz go przed zapisem.
        </p>
        <Input
          label="Opis wizyty lub badania"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Np. W poniedziałek byłem u logopedy…"
          autoFocus
        />
        {!draft ? (
          <Button
            className="w-full"
            icon={<Sparkles size={16} />}
            disabled={!text.trim()}
            onClick={() => setDraft(parseMedicalEntry(text))}
          >
            Przygotuj wpis
          </Button>
        ) : (
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-custom bg-surface-2 p-4">
            <div>
              <p className="ios-section-label">Do zatwierdzenia</p>
              <h4 className="mt-1 text-base font-bold text-text-primary">{draft.title}</h4>
              <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                <CalendarDays size={15} /> {draft.occurredOn}
                {draft.specialty ? ` · ${draft.specialty}` : ''}
              </p>
            </div>
            <Input
              label="Data zdarzenia"
              type="date"
              value={draft.occurredOn}
              onChange={(event) => setDraft({ ...draft, occurredOn: event.target.value })}
            />
            <Input
              label="Tytuł"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDraft(null)}>
                Popraw opis
              </Button>
              <Button loading={saving} className="flex-1" onClick={() => onSave(draft)}>
                Zapisz
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
