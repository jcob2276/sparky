import { useState } from 'react';
import { X } from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { initialFormState, validateAssignmentForm, type AssignmentFormState } from '../../../lib/learning/assignmentForm';
import { notify } from '../../../lib/notify';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import LearningAssignmentForm from './LearningAssignmentForm';
import LearningPocketPicker from './LearningPocketPicker';
import { useCreateAssignment, usePocketCandidates, useTopSkills } from './useLearningPlan';

interface LearningAddModalProps {
  userId: string;
  monthStart: string;
  today: string;
  nextPosition: number;
  excludeLinkIds: string[];
  /** Gdy podany (np. z Pocket), od razu pokazuje formularz dla tego linku. */
  initialLink?: SavedLink | null;
  onClose: () => void;
}

/** Dodawanie pozycji do planu miesiąca: wybór z Pocketa albo materiał własny, potem tytuł, ilość i termin. */
export default function LearningAddModal({ userId, monthStart, today, nextPosition, excludeLinkIds, initialLink = null, onClose }: LearningAddModalProps) {
  const [form, setForm] = useState<AssignmentFormState | null>(initialLink ? initialFormState(today, initialLink) : null);
  const [error, setError] = useState<string | null>(null);
  const pocket = usePocketCandidates(userId, excludeLinkIds, !initialLink);
  const skills = useTopSkills(userId, true);
  const create = useCreateAssignment(userId);

  const submit = async () => {
    if (!form) return;
    const result = validateAssignmentForm(form, today, monthStart, nextPosition);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await create.mutateAsync(result.value);
      notify('Dodano do planu miesiąca', 'success');
      onClose();
    } catch (err: unknown) {
      console.error('[learning] create assignment failed:', err);
      setError('Nie udało się zapisać. Spróbuj ponownie.');
    }
  };

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-0" overflowY={false} size="md">
      <div className="flex max-h-[var(--ds-h-85vh)] w-full flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border-custom/20 p-4">
          <h2 className="text-base font-semibold text-text-primary">Dodaj do miesiąca</h2>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={18} />} aria-label="Zamknij" />
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {form ? (
            <LearningAssignmentForm
              form={form}
              skills={skills.data ?? []}
              today={today}
              error={error}
              saving={create.isPending}
              onChange={(patch) => setForm((current) => (current ? { ...current, ...patch } : current))}
              onSubmit={() => void submit()}
              onBack={initialLink ? undefined : () => { setForm(null); setError(null); }}
            />
          ) : (
            <LearningPocketPicker
              links={pocket.data}
              loading={pocket.isLoading}
              error={pocket.error}
              onPick={(link) => setForm(initialFormState(today, link))}
              onCustom={() => setForm(initialFormState(today))}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
