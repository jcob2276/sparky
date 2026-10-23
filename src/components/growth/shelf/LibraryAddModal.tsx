import { useState } from 'react';
import { X } from 'lucide-react';
import { initialLibraryForm, validateLibraryItem, type LibraryItemFormState } from '../../../lib/learning/libraryItemForm';
import { LIBRARY_TYPE_LABELS, type LibraryType } from '../../../lib/learning/shelfModel';
import { notify } from '../../../lib/notify';
import Button from '../../ui/Button';
import { ControlInput, ControlSelect } from '../../ui/ControlPrimitives';
import Modal from '../../ui/Modal';
import { useAddLibraryItems } from './useLibrary';

const FIELD = 'w-full rounded-xl border border-border-custom/60 bg-surface-2 px-3 py-2 text-sm font-semibold text-text-primary';
const LABEL = 'text-xs font-bold text-text-secondary block mb-1';
const TYPES = Object.keys(LIBRARY_TYPE_LABELS) as LibraryType[];

interface LibraryAddModalProps {
  userId: string;
  today: string;
  onClose: () => void;
}

/** Dopisanie jednej pozycji do biblioteki: wystarczy tytuł, reszta jest opcjonalna. */
export default function LibraryAddModal({ userId, today, onClose }: LibraryAddModalProps) {
  const [form, setForm] = useState<LibraryItemFormState>(initialLibraryForm());
  const [error, setError] = useState<string | null>(null);
  const add = useAddLibraryItems(userId);
  const patch = (next: Partial<LibraryItemFormState>) => setForm((current) => ({ ...current, ...next }));

  const submit = async () => {
    const result = validateLibraryItem(form, today);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      const summary = await add.mutateAsync([result.value]);
      if (summary.added === 0) {
        setError('Taka pozycja już jest w bibliotece.');
        return;
      }
      notify('Dodano na półkę', 'success');
      onClose();
    } catch (err: unknown) {
      console.error('[library] add failed:', err);
      setError('Nie udało się zapisać. Spróbuj ponownie.');
    }
  };

  const showPages = form.resourceType === 'book' || form.resourceType === 'course';

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-0" overflowY={false} size="md">
      <div className="flex max-h-[var(--ds-h-85vh)] w-full flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border-custom/20 p-4">
          <h2 className="text-base font-semibold text-text-primary">Dodaj do biblioteki</h2>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={18} />} aria-label="Zamknij" />
        </header>
        <form
          className="flex-1 space-y-3 overflow-y-auto p-4"
          onSubmit={(event) => { event.preventDefault(); void submit(); }}
        >
          <div>
            <label htmlFor="lib-title" className={LABEL}>Tytuł</label>
            <ControlInput id="lib-title" type="text" className={FIELD} maxLength={200} value={form.title}
              onChange={(event) => patch({ title: event.target.value })} placeholder="Np. Dune" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="lib-type" className={LABEL}>Rodzaj</label>
              <ControlSelect id="lib-type" className={FIELD} value={form.resourceType}
                onChange={(event) => patch({ resourceType: event.target.value as LibraryType })}>
                {TYPES.map((type) => <option key={type} value={type}>{LIBRARY_TYPE_LABELS[type]}</option>)}
              </ControlSelect>
            </div>
            <div>
              <label htmlFor="lib-author" className={LABEL}>Autor / reżyser (opcjonalnie)</label>
              <ControlInput id="lib-author" type="text" className={FIELD} maxLength={200} value={form.author}
                onChange={(event) => patch({ author: event.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="lib-date" className={LABEL}>Kiedy skończone (opcjonalnie)</label>
              <ControlInput id="lib-date" type="date" className={FIELD} max={today} value={form.finishedOn}
                onChange={(event) => patch({ finishedOn: event.target.value })} />
            </div>
            <div>
              <label htmlFor="lib-year" className={LABEL}>Albo sam rok</label>
              <ControlInput id="lib-year" type="text" inputMode="numeric" autoComplete="off" className={FIELD} value={form.finishedYear}
                disabled={Boolean(form.finishedOn)} placeholder="np. 2018"
                onChange={(event) => patch({ finishedYear: event.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </div>
          </div>
          {showPages && (
            <div>
              <label htmlFor="lib-pages" className={LABEL}>Liczba stron (opcjonalnie, grubsza książka = grubszy grzbiet)</label>
              <ControlInput id="lib-pages" type="text" inputMode="numeric" autoComplete="off" className={FIELD} value={form.pages}
                onChange={(event) => patch({ pages: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="np. 320" />
            </div>
          )}
          {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
          <Button type="submit" loading={add.isPending} className="w-full">Dodaj na półkę</Button>
        </form>
      </div>
    </Modal>
  );
}
