import { Pressable, ControlTextarea } from '../../ui/ControlPrimitives';
import {
  Check,
  ListTodo,
  PenLine,
  StickyNote,
} from 'lucide-react';
import Spinner from '../../ui/Spinner';
import type { SavedLink } from '../../../lib/linksApi';
import { CATEGORIES, CATEGORY_COLORS, getYouTubeId } from './linksUtils';

interface LinksExpandedDetailsProps {
  link: SavedLink;
  notesDraft: string | undefined;
  savedNoteId: string | null;
  convertingLinkId: string | null;
  onUpdateCategory: (id: string, cat: string) => void;
  onSaveNotes: (id: string) => void;
  onChangeNotesDraft: (id: string, value: string) => void;
  onConvertToTodo: (link: SavedLink) => void;
  onConvertToNote: (link: SavedLink) => void;
}

export function LinksExpandedDetails({
  link,
  notesDraft,
  savedNoteId,
  convertingLinkId,
  onUpdateCategory,
  onSaveNotes,
  onChangeNotesDraft,
  onConvertToTodo,
  onConvertToNote,
}: LinksExpandedDetailsProps) {
  const youtubeId = getYouTubeId(link.url);

  return (
    <div className="mt-3 pt-3 space-y-3.5 border-t border-border-custom/30 text-left">
      {/* YouTube Embed */}
      {youtubeId && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-scrim shadow-inner border border-border-custom/50">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={link.title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* AI Key Takeaways */}
      {link.takeaways && link.takeaways.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Kluczowe wnioski</p>
          <ul className="space-y-1.5">
            {link.takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-text-primary">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xs font-bold text-primary">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Action Conversion Buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border-custom/20">
        <Pressable
          variant="tonal"
          size="sm"
          disabled={convertingLinkId === link.id}
          onClick={() => onConvertToTodo(link)}
          className="btn-press flex-1 min-w-[120px] justify-center gap-1.5 text-xs font-semibold"
          icon={convertingLinkId === link.id ? <Spinner size="sm" className="h-3 w-3" /> : <ListTodo size={12} />}
        >
          Zrób zadanie
        </Pressable>
        <Pressable
          variant="outline"
          size="sm"
          disabled={convertingLinkId === link.id}
          onClick={() => onConvertToNote(link)}
          className="btn-press flex-1 min-w-[120px] justify-center gap-1.5 text-xs font-semibold"
          icon={<StickyNote size={12} />}
        >
          Do notatek
        </Pressable>
      </div>

      {/* Category Pills */}
      <div className="space-y-1 pt-1 border-t border-border-custom/20">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Kategoria</p>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => {
            const isActive = link.category === cat;
            const cStyle = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Inne'];
            return (
              <Pressable
                key={cat}
                onClick={() => onUpdateCategory(link.id, cat)}
                className={`rounded-full px-2 py-0.5 text-2xs font-semibold border ui-interactive btn-press ${
                  isActive
                    ? `${cStyle.pill} border-current ring-1 ring-current`
                    : 'border-border-custom/40 bg-surface-solid/40 text-text-muted hover:text-text-primary'
                }`}
              >
                {cat}
              </Pressable>
            );
          })}
        </div>
      </div>

      {/* Reflections & Notes */}
      <div className="space-y-1.5 pt-1 border-t border-border-custom/20">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <PenLine size={10} /> Przemyślenia i notatki
          </p>
          {savedNoteId === link.id && (
            <span className="flex items-center gap-1 text-3xs font-semibold text-success">
              <Check size={9} /> Zapisano
            </span>
          )}
        </div>
        <ControlTextarea
          value={notesDraft ?? (link.notes || '')}
          onChange={(e) => onChangeNotesDraft(link.id, e.target.value)}
          onBlur={() => onSaveNotes(link.id)}
          placeholder="Wpisz swoje refleksje lub wnioski (zapisuje się automatycznie)..."
          rows={2}
          className="w-full resize-none rounded-xl border border-border-custom/30 bg-surface-solid/30 p-2 text-xs leading-relaxed text-text-primary outline-none focus:border-primary/40"
        />
      </div>
    </div>
  );
}
