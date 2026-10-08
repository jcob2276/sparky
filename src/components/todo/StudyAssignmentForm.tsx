import { useId, useRef, useState } from 'react';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';

interface StudyAssignmentFormProps {
  onSave: (title: string, dueDate: string) => Promise<void>;
}

export default function StudyAssignmentForm({ onSave }: StudyAssignmentFormProps) {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || saving) return;
    const form = event.currentTarget;
    const dueDate = String(new FormData(form).get('due_date') || '');
    setSaving(true);
    setError(null);
    try {
      await onSave(title.trim(), dueDate);
      setTitle('');
      form.reset();
      titleRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać zadania. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-border-custom/40 px-3 py-4 sm:px-4">
      <div className="study-assignment-fields grid gap-3">
        <label htmlFor={`${id}-title`} className="min-w-0 space-y-1.5 text-xs font-semibold text-text-secondary">
          <span>Co jest do zrobienia?</span>
          <ControlInput
            id={`${id}-title`} ref={titleRef} value={title} required disabled={saving}
            onChange={event => setTitle(event.target.value)}
            placeholder="Np. oddać sprawozdanie z laboratorium"
            className="min-h-11 w-full rounded-lg border border-border-custom bg-surface-solid px-3 text-sm text-text-primary focus:border-primary"
          />
        </label>
        <label htmlFor={`${id}-date`} className="min-w-0 space-y-1.5 text-xs font-semibold text-text-secondary">
          <span>Na kiedy? <span className="font-normal text-text-muted">(opcjonalnie)</span></span>
          <ControlInput
            id={`${id}-date`} name="due_date" type="date" defaultValue="" disabled={saving}
            className="min-h-11 w-full min-w-0 rounded-lg border border-border-custom bg-surface-solid px-3 text-sm text-text-primary focus:border-primary"
          />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-text-muted">Termin możesz później zmienić.</span>
        <Pressable type="submit" disabled={saving || !title.trim()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-accent">
          {saving ? 'Zapisywanie…' : 'Dodaj zadanie'}
        </Pressable>
      </div>
    </form>
  );
}
