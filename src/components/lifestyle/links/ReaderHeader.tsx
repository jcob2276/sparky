import { Pressable } from '../../ui/ControlPrimitives';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { formatDomainName } from './linksUtils';
import { notify } from '../../../lib/notify';

interface ReaderHeaderProps {
  link: SavedLink;
  readingTime: number;
  onToggleRead: (id: string, status: 'unread' | 'read') => void;
}

export function ReaderHeader({ link, readingTime, onToggleRead }: ReaderHeaderProps) {
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
