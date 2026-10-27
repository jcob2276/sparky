import Modal from '../../ui/Modal';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '← / →  ·  k / j', label: 'Poprzedni / następny okres' },
  { keys: 't', label: 'Dzisiaj' },
  { keys: 'd  ·  1', label: 'Widok dnia' },
  { keys: '3', label: 'Widok 3 dni' },
  { keys: 'w  ·  7', label: 'Widok tygodnia' },
  { keys: 'm', label: 'Widok miesiąca' },
  { keys: 'c', label: 'Nowe wydarzenie' },
  { keys: 'e', label: 'Edytuj otwarte wydarzenie' },
  { keys: 'Delete  ·  ⌫', label: 'Usuń otwarte wydarzenie' },
  { keys: '⌘Z  ·  Ctrl+Z', label: 'Cofnij ostatnią zmianę' },
  { keys: '⇧⌘Z  ·  Ctrl+Shift+Z', label: 'Ponów cofniętą zmianę' },
  { keys: 'Esc', label: 'Zamknij podgląd lub okno tworzenia' },
  { keys: '?', label: 'Ta ściąga' },
];

export default function CalendarShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Skróty kalendarza" size="sm">
      <dl className="grid gap-1.5 text-sm">
        {SHORTCUTS.map(({ keys, label }) => (
          <div key={keys} className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">{label}</dt>
            <dd><kbd className="whitespace-nowrap rounded-md border border-border-custom bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text-primary">{keys}</kbd></dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-text-muted">Na telefonie przytrzymaj wydarzenie, żeby je przesunąć, i pociągnij dolną krawędź, żeby zmienić długość.</p>
    </Modal>
  );
}
