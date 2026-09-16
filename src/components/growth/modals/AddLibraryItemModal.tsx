import { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { ControlInput, ControlSelect, ControlTextarea } from '../../ui/ControlPrimitives';
import type { LibraryItem, LibraryItemStatus, LibraryItemType } from '../../../lib/growth/growth.types';
import { saveLibraryItems } from '../../../lib/growth/growthApi';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';

interface Props {
  userId: string;
  libraryItems: LibraryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddLibraryItemModal({ userId, libraryItems, isOpen, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LibraryItemType>('book');
  const [status, setStatus] = useState<LibraryItemStatus>('in_progress');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!title.trim()) {
      notify('Podaj tytuł materiału.', 'error');
      return;
    }

    setSaving(true);
    try {
      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        title: title.trim(),
        type,
        status,
        url: url.trim() || undefined,
        note: note.trim() || undefined,
        createdAt: getTodayWarsaw(),
      };

      const updated = [newItem, ...libraryItems];
      await saveLibraryItems(userId, updated);
      notify('Materiał dodany do biblioteki.', 'success');
      onSaved();
      onClose();
      // Reset form
      setTitle('');
      setType('book');
      setStatus('in_progress');
      setUrl('');
      setNote('');
    } catch {
      notify('Nie udało się zapisać materiału.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dodaj Materiał do Biblioteki">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Tytuł Materiału / Książki
          </label>
          <ControlInput
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Designing Data-Intensive Applications"
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Typ</label>
            <ControlSelect
              value={type}
              onChange={(e) => setType(e.target.value as LibraryItemType)}
              className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
            >
              <option value="book">Książka</option>
              <option value="course">Kurs</option>
              <option value="article">Artykuł</option>
              <option value="podcast">Podcast</option>
              <option value="video">Wideo</option>
            </ControlSelect>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Status</label>
            <ControlSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as LibraryItemStatus)}
              className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
            >
              <option value="in_progress">W trakcie (Teraz)</option>
              <option value="want_to_learn">W kolejce</option>
              <option value="applied">Zastosowane / Wdrożone</option>
            </ControlSelect>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Link URL (opcjonalnie)</label>
          <ControlInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Kluczowa notatka / wniosek</label>
          <ControlTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Czego dotyczy lub co chcesz z tego wyciągnąć..."
            rows={2}
            className="w-full rounded-xl border border-border-custom bg-background px-3.5 py-2 text-sm font-semibold text-text-primary focus:border-primary outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button variant="primary" onClick={() => void handleAdd()} disabled={saving}>Dodaj</Button>
        </div>
      </div>
    </Modal>
  );
}
