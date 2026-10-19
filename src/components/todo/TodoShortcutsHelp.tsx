import Modal from '../ui/Modal';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'j / k  ·  ↓ / ↑', label: 'Następne / poprzednie zadanie' },
  { keys: 'x  ·  Spacja', label: 'Ukończ / otwórz ponownie' },
  { keys: 'e', label: 'Edytuj tytuł (Enter zapisuje, Esc anuluje)' },
  { keys: 'Enter', label: 'Rozwiń / zwiń szczegóły' },
  { keys: 'd', label: 'Ustaw termin' },
  { keys: 'p', label: 'Ustaw priorytet' },
  { keys: 'm', label: 'Przenieś do sekcji' },
  { keys: 'Delete', label: 'Usuń zadanie' },
  { keys: 'n', label: 'Nowe zadanie' },
  { keys: '/  ·  Ctrl+K', label: 'Szukaj' },
  { keys: '1 / 2 / 3', label: 'Widok: lista / kanban / matryca' },
  { keys: '?', label: 'Ta ściąga' },
];

export default function TodoShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Skróty klawiszowe" size="sm">
      <dl className="grid gap-1.5 text-sm">
        {SHORTCUTS.map(({ keys, label }) => (
          <div key={keys} className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">{label}</dt>
            <dd><kbd className="whitespace-nowrap rounded-md border border-border-custom bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text-primary">{keys}</kbd></dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
