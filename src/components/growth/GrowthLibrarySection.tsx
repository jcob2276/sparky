import { useState } from 'react';
import { BookOpen, Book, FileText, Headphones, Video, ExternalLink, Plus, Check, Trash2 } from 'lucide-react';
import type { LibraryItem, LibraryItemStatus, LibraryItemType } from '../../lib/growth/growth.types';
import { Pressable } from '../ui/ControlPrimitives';
import { saveLibraryItems } from '../../lib/growth/growthApi';
import { notify } from '../../lib/notify';
import { confirmDialog } from '../../lib/notify';

interface Props {
  userId: string;
  items: LibraryItem[];
  onRefresh: () => void;
  onOpenAddModal: () => void;
}

const TYPE_ICONS: Record<LibraryItemType, typeof Book> = {
  book: Book,
  course: BookOpen,
  article: FileText,
  podcast: Headphones,
  video: Video,
  note: FileText,
  experiment: BookOpen,
};

const STATUS_TABS: { id: LibraryItemStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'in_progress', label: 'W trakcie' },
  { id: 'want_to_learn', label: 'W kolejce' },
  { id: 'applied', label: 'Zastosowane' },
];

export function GrowthLibrarySection({ userId, items, onRefresh, onOpenAddModal }: Props) {
  const [activeTab, setActiveTab] = useState<LibraryItemStatus | 'all'>('all');

  const filteredItems = activeTab === 'all'
    ? items
    : items.filter((item) => item.status === activeTab);

  async function handleStatusChange(item: LibraryItem, newStatus: LibraryItemStatus) {
    const updated = items.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i));
    try {
      await saveLibraryItems(userId, updated);
      notify(`Status "${item.title}" zaktualizowany.`, 'success');
      onRefresh();
    } catch {
      notify('Błąd podczas zmiany statusu.', 'error');
    }
  }

  async function handleDelete(item: LibraryItem) {
    const ok = await confirmDialog(`Czy na pewno chcesz usunąć materiał "${item.title}"?`);
    if (!ok) return;

    const updated = items.filter((i) => i.id !== item.id);
    try {
      await saveLibraryItems(userId, updated);
      notify(`Usunięto "${item.title}".`, 'info');
      onRefresh();
    } catch {
      notify('Błąd podczas usuwania.', 'error');
    }
  }

  return (
    <div className="rounded-3xl border border-border-custom/80 bg-surface/70 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Baza Materiałów & Półka</p>
            <h3 className="text-sm font-bold text-text-primary">Biblioteka Wiedzy (Książki / Kursy)</h3>
          </div>
        </div>
        <Pressable
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-on-accent hover:bg-primary-hover transition-colors shadow-xs"
        >
          <Plus size={13} />
          <span>Dodaj</span>
        </Pressable>
      </div>

      {/* Zakładki statusów */}
      <div className="flex flex-wrap gap-1 border-b border-border-custom/40 pb-2">
        {STATUS_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-text-muted hover:text-text-primary hover:bg-background/40'
            }`}
          >
            {tab.label}
          </Pressable>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom p-6 text-center space-y-2">
          <p className="text-xs text-text-muted">
            Brak materiałów w tej kategorii. Dodaj książkę, kurs lub artykuł, z którego aktualnie czerpiesz wiedzę.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const Icon = TYPE_ICONS[item.type] || BookOpen;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-border-custom/60 bg-background/50 p-4 space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1 rounded-md bg-border-custom/60 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-text-muted">
                      <Icon size={11} />
                      <span>{item.type}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-muted hover:text-primary transition-colors p-1"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <Pressable
                        onClick={() => void handleDelete(item)}
                        className="text-text-muted hover:text-danger transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </Pressable>
                    </div>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-text-primary leading-snug">{item.title}</h4>
                  {item.note && <p className="mt-1 text-xs text-text-secondary italic">{item.note}</p>}
                </div>

                <div className="flex items-center justify-between border-t border-border-custom/40 pt-2.5">
                  <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'applied' ? 'bg-success/15 text-success' :
                    item.status === 'in_progress' ? 'bg-primary/15 text-primary' : 'bg-border-custom text-text-muted'
                  }`}>
                    {item.status === 'in_progress' ? 'W trakcie' : item.status === 'want_to_learn' ? 'W kolejce' : 'Zastosowane'}
                  </span>

                  {item.status !== 'applied' && (
                    <Pressable
                      onClick={() => void handleStatusChange(item, 'applied')}
                      className="flex items-center gap-1 text-2xs font-bold text-success hover:underline"
                    >
                      <Check size={11} />
                      <span>Oznacz jako wdrożone</span>
                    </Pressable>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
