import { useState } from 'react';
import Modal from '../../ui/Modal';
import { Pressable, ControlTextarea } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import {
  BookOpen,
  ListTodo,
  PenLine,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { estimateReadingTime, getYouTubeId } from './linksUtils';
import { ReaderHeader } from './ReaderHeader';
import { useUserId } from '../../../store/useStore';
import { summarizeLinkWithSpheres } from '../../../lib/linksApi';
import { notify } from '../../../lib/notify';

interface ReaderBodyProps {
  link: SavedLink;
  youtubeId: string | null;
  onSaveNotes: (id: string, notes: string) => void;
  onConvertToTodo: (link: SavedLink) => void;
  onConvertToNote: (link: SavedLink) => void;
  onGenerateAi: () => void;
  isAnalyzing: boolean;
}

function ReaderBody({
  link,
  youtubeId,
  onSaveNotes,
  onConvertToTodo,
  onConvertToNote,
  onGenerateAi,
  isAnalyzing,
}: ReaderBodyProps) {
  return (
    <>
      {youtubeId && (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-scrim border border-border-custom/40 shadow-sm">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={link.title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {link.description && (
        <div className="text-sm leading-relaxed text-text-secondary bg-surface-solid/30 p-4 rounded-2xl border border-border-custom/20">
          <p className="whitespace-pre-line">{link.description}</p>
        </div>
      )}

      {/* 3 Spheres AI Synthesis Section */}
      <div className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
            <Sparkles size={14} />
            <span>Wnioski AI · 3 Sfery</span>
          </div>
          {link.category && (
            <span className={`px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider border ${
              link.category === 'Ciało'
                ? 'bg-success/15 text-success border-success/30'
                : link.category === 'Duch'
                ? 'bg-info/15 text-info border-info/30'
                : link.category === 'Konto'
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              {link.category}
            </span>
          )}
        </div>

        {link.takeaways && link.takeaways.length > 0 ? (
          <ul className="space-y-2 pt-1">
            {link.takeaways.map((t, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-text-primary">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-3xs font-black text-primary mt-0.5">
                  {idx + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">
            Brak przetworzonych wniosków pod kątem Ciała, Ducha i Konta.
          </p>
        )}

        <div className="pt-2">
          <Button
            variant={link.takeaways?.length ? 'outline' : 'primary'}
            size="sm"
            onClick={onGenerateAi}
            loading={isAnalyzing}
            icon={!isAnalyzing ? <Sparkles size={13} /> : undefined}
            className="w-full text-2xs font-black uppercase tracking-wider"
          >
            {isAnalyzing ? 'Analizowanie materiału...' : link.takeaways?.length ? 'Przelicz wnioski (3 Sfery)' : 'Wygeneruj wnioski AI (3 Sfery)'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border-custom/20">
        <Pressable
          variant="tonal"
          size="sm"
          onClick={() => onConvertToTodo(link)}
          className="flex-1 justify-center gap-1.5 text-xs font-semibold btn-press"
        >
          <ListTodo size={13} />
          <span>Utwórz zadanie</span>
        </Pressable>
        <Pressable
          variant="outline"
          size="sm"
          onClick={() => onConvertToNote(link)}
          className="flex-1 justify-center gap-1.5 text-xs font-semibold btn-press"
        >
          <StickyNote size={13} />
          <span>Zapisz do notatek</span>
        </Pressable>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border-custom/20">
        <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-muted">
          <PenLine size={12} /> Twoje notatki i przemyślenia
        </p>
        <ControlTextarea
          defaultValue={link.notes || ''}
          onBlur={(e) => onSaveNotes(link.id, e.target.value)}
          placeholder="Zapisz swoje wnioski i refleksje..."
          rows={3}
          className="w-full rounded-xl border border-border-custom/40 bg-surface-solid/40 p-3 text-xs leading-relaxed text-text-primary outline-none focus:border-primary/50"
        />
      </div>
    </>
  );
}

interface LinkReaderModalProps {
  link: SavedLink | null;
  onClose: () => void;
  onToggleRead: (id: string, status: 'unread' | 'read') => void;
  onSaveNotes: (id: string, notes: string) => void;
  onConvertToTodo: (link: SavedLink) => void;
  onConvertToNote: (link: SavedLink) => void;
  onUpdateLink?: (id: string, updates: Partial<SavedLink>) => void;
}

export function LinkReaderModal({
  link,
  onClose,
  onToggleRead,
  onSaveNotes,
  onConvertToTodo,
  onConvertToNote,
  onUpdateLink,
}: LinkReaderModalProps) {
  const userId = useUserId();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!link) return null;

  const readingTime = estimateReadingTime(link.description + ' ' + (link.takeaways || []).join(' '));
  const youtubeId = getYouTubeId(link.url);

  const handleGenerateAi = async () => {
    if (!userId || !link) return;
    setIsAnalyzing(true);
    try {
      const res = await summarizeLinkWithSpheres(userId, link.id);
      if (res) {
        onUpdateLink?.(link.id, {
          category: res.category,
          takeaways: res.takeaways,
        });
        notify(`Wygenerowano wnioski dla sfery: ${res.category}`, 'success');
      } else {
        notify('Nie udało się wygenerować wniosków', 'error');
      }
    } catch {
      notify('Błąd podczas generowania wniosków AI', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-primary font-bold text-sm">
          <BookOpen size={16} /> Tryb Czytnika
        </span>
      }
      size="lg"
    >
      <div className="space-y-4 p-5 max-h-[75vh] overflow-y-auto no-scrollbar">
        <ReaderHeader
          link={link}
          readingTime={readingTime}
          onToggleRead={onToggleRead}
        />
        <ReaderBody
          link={link}
          youtubeId={youtubeId}
          onSaveNotes={onSaveNotes}
          onConvertToTodo={onConvertToTodo}
          onConvertToNote={onConvertToNote}
          onGenerateAi={handleGenerateAi}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </Modal>
  );
}
