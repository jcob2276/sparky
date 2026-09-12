import Modal from '../../ui/Modal';
import { Pressable, ControlTextarea } from '../../ui/ControlPrimitives';
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  ListTodo,
  PenLine,
  Share2,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { formatDomainName, estimateReadingTime, getYouTubeId } from './linksUtils';
import { notify } from '../../../lib/notify';

interface ReaderHeaderProps {
  link: SavedLink;
  readingTime: number;
  onToggleRead: (id: string, status: 'unread' | 'read') => void;
}

function ReaderHeader({ link, readingTime, onToggleRead }: ReaderHeaderProps) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      notify('Skopiowano link do schowka', 'success');
    } catch {
      notify('Nie udało się skopiować linku', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: link.title, url: link.url });
      } catch {
        // Ignored if user dismissed
      }
    } else {
      void handleCopyLink();
    }
  };

  return (
    <div className="space-y-1.5 border-b border-border-custom/30 pb-3">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="font-semibold text-primary">{formatDomainName(link.domain)}</span>
        <span>·</span>
        <span>~{readingTime} min czytania</span>
        <span>·</span>
        <span>{link.category}</span>
      </div>

      <h2 className="text-xl font-bold leading-snug text-text-primary tracking-tight">
        {link.title}
      </h2>

      <div className="flex items-center gap-2 pt-1">
        <Pressable
          variant={link.status === 'read' ? 'tonal' : 'primary'}
          size="sm"
          onClick={() => onToggleRead(link.id, link.status)}
          className="btn-press text-xs font-semibold"
        >
          <Check size={13} />
          <span>{link.status === 'read' ? 'Przeczytane' : 'Oznacz jako przeczytane'}</span>
        </Pressable>

        <Pressable
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="btn-press text-xs"
          title="Kopiuj link"
        >
          <Copy size={13} />
        </Pressable>

        <Pressable
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="btn-press text-xs"
          title="Udostępnij"
        >
          <Share2 size={13} />
        </Pressable>

        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-xl border border-border-custom bg-surface-solid/50 text-text-primary hover:bg-surface-solid transition-colors"
        >
          <ExternalLink size={13} />
          <span>Oryginał</span>
        </a>
      </div>
    </div>
  );
}

interface ReaderBodyProps {
  link: SavedLink;
  youtubeId: string | null;
  onSaveNotes: (id: string, notes: string) => void;
  onConvertToTodo: (link: SavedLink) => void;
  onConvertToNote: (link: SavedLink) => void;
}

function ReaderBody({
  link,
  youtubeId,
  onSaveNotes,
  onConvertToTodo,
  onConvertToNote,
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

      {link.takeaways && link.takeaways.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles size={14} />
            <span>Główne wnioski AI</span>
          </div>
          <ul className="space-y-2">
            {link.takeaways.map((t, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-text-primary">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-3xs font-black text-primary">
                  {idx + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
}

export function LinkReaderModal({
  link,
  onClose,
  onToggleRead,
  onSaveNotes,
  onConvertToTodo,
  onConvertToNote,
}: LinkReaderModalProps) {
  if (!link) return null;

  const readingTime = estimateReadingTime(link.description + ' ' + (link.takeaways || []).join(' '));
  const youtubeId = getYouTubeId(link.url);

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
        />
      </div>
    </Modal>
  );
}
