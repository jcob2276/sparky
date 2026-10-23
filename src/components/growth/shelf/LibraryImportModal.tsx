import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  parseLibraryCsv,
  parseLibraryList,
  splitDuplicates,
  type CsvFormat,
} from '../../../lib/learning/libraryImport';
import type { LibraryItem, LibraryType } from '../../../lib/learning/shelfModel';
import { notify } from '../../../lib/notify';
import Button from '../../ui/Button';
import { ControlInput, ControlTextarea } from '../../ui/ControlPrimitives';
import Modal from '../../ui/Modal';
import LibraryImportPreview from './LibraryImportPreview';
import { useAddLibraryItems } from './useLibrary';

const MAX_FILE_BYTES = 2_000_000;
const FORMAT_LABELS: Record<CsvFormat, string> = {
  goodreads: 'Goodreads',
  letterboxd: 'Letterboxd',
  generic: 'własny plik CSV',
  unknown: 'nierozpoznany',
};
const PLACEHOLDER = `Książki:
Dune — Frank Herbert
Solaris — Stanisław Lem ★★★★★
Filmy 2019:
Joker
Matrix
2015:
Heat`;

interface LibraryImportModalProps {
  userId: string;
  today: string;
  existing: LibraryItem[];
  onClose: () => void;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Nie udało się odczytać pliku'));
    reader.readAsText(file);
  });
}

/** Import hurtem: wklejona lista (z nagłówkami „Książki:”, „Filmy 2019:”) albo plik CSV z Goodreads / Letterboxd. */
export default function LibraryImportModal({ userId, today, existing, onClose }: LibraryImportModalProps) {
  const [tab, setTab] = useState<'paste' | 'csv'>('paste');
  const [text, setText] = useState('');
  const [defaultType, setDefaultType] = useState<LibraryType>('book');
  const [csvText, setCsvText] = useState('');
  const [csvName, setCsvName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const add = useAddLibraryItems(userId);

  const parsed = useMemo(() => {
    if (tab === 'paste') return { ...parseLibraryList(text, defaultType), format: null as CsvFormat | null };
    if (!csvText) return { rows: [], skipped: 0, format: null as CsvFormat | null };
    return parseLibraryCsv(csvText, today);
  }, [tab, text, defaultType, csvText, today]);
  const { fresh, duplicates } = useMemo(() => splitDuplicates(parsed.rows, existing), [parsed.rows, existing]);

  const onFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('Plik jest za duży (max 2 MB).');
      return;
    }
    try {
      setCsvText(await readFileText(file));
      setCsvName(file.name);
    } catch {
      setFileError('Nie udało się odczytać pliku.');
    }
  };

  const submit = async () => {
    setSaveError(null);
    try {
      const summary = await add.mutateAsync(fresh);
      notify(`Dodano na półkę: ${summary.added}${summary.skipped ? ` (pominięte duplikaty: ${summary.skipped})` : ''}`, 'success');
      onClose();
    } catch (err: unknown) {
      console.error('[library] import failed:', err);
      setSaveError('Nie udało się zapisać importu. Spróbuj ponownie.');
    }
  };

  const unknownCsv = tab === 'csv' && parsed.format === 'unknown';

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-0" overflowY={false} size="lg">
      <div className="flex max-h-[var(--ds-h-85vh)] w-full flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border-custom/20 p-4">
          <h2 className="text-base font-semibold text-text-primary">Importuj do biblioteki</h2>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={18} />} aria-label="Zamknij" />
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div role="group" aria-label="Sposób importu" className="flex gap-1.5">
            <Button size="sm" variant={tab === 'paste' ? 'tonal' : 'ghost'} aria-pressed={tab === 'paste'} onClick={() => setTab('paste')}>Wklej listę</Button>
            <Button size="sm" variant={tab === 'csv' ? 'tonal' : 'ghost'} aria-pressed={tab === 'csv'} onClick={() => setTab('csv')}>Plik CSV</Button>
          </div>

          {tab === 'paste' ? (
            <div className="space-y-2">
              <label htmlFor="lib-import-text" className="text-xs font-bold text-text-secondary block">
                Jedna pozycja w linii. Nagłówki „Książki:”, „Filmy:”, „2019:” ustawiają rodzaj i rok.
              </label>
              <ControlTextarea
                id="lib-import-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={PLACEHOLDER}
                rows={9}
                className="w-full rounded-xl border border-border-custom/60 bg-surface-2 px-3 py-2 text-sm text-text-primary resize-y"
              />
              <div role="group" aria-label="Domyślny rodzaj" className="flex items-center gap-1.5 text-xs text-text-muted">
                Domyślnie:
                <Button size="sm" variant={defaultType === 'book' ? 'tonal' : 'ghost'} aria-pressed={defaultType === 'book'} onClick={() => setDefaultType('book')}>Książki</Button>
                <Button size="sm" variant={defaultType === 'video' ? 'tonal' : 'ghost'} aria-pressed={defaultType === 'video'} onClick={() => setDefaultType('video')}>Filmy</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="lib-import-file" className="text-xs font-bold text-text-secondary block">
                Eksport z Goodreads (tylko półka „read”), Letterboxd (obejrzane) albo własny plik z kolumnami Tytuł, Autor, Rodzaj, Strony, Data, Ocena.
              </label>
              <ControlInput
                id="lib-import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void onFile(event.target.files?.[0])}
                className="w-full text-xs"
              />
              {csvName && !unknownCsv && parsed.format && (
                <p className="text-xs text-text-muted">{csvName}: rozpoznano {FORMAT_LABELS[parsed.format]}.</p>
              )}
              {unknownCsv && <p role="alert" className="text-xs font-semibold text-danger">Nie znalazłem kolumny z tytułem. Sprawdź plik.</p>}
              {fileError && <p role="alert" className="text-xs font-semibold text-danger">{fileError}</p>}
            </div>
          )}

          {(parsed.rows.length > 0 || parsed.skipped > 0) && (
            <LibraryImportPreview fresh={fresh} duplicates={duplicates.length} skipped={parsed.skipped} />
          )}
          {saveError && <p role="alert" className="text-xs font-semibold text-danger">{saveError}</p>}
        </div>

        <footer className="border-t border-border-custom/20 p-4">
          <Button onClick={() => void submit()} disabled={fresh.length === 0} loading={add.isPending} className="w-full">
            {fresh.length > 0 ? `Dodaj ${fresh.length} na półkę` : 'Nic do dodania'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
