import { format, parseISO } from 'date-fns';
import { Trash2, Sparkles, Film } from 'lucide-react';
import type { ProgressPhoto } from '../../lib/photosApi';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  photos: ProgressPhoto[];
  baseId: string | null;
  targetId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, url: string, thumbnailUrl: string | null) => void;
}

export default function PhotosTimelineList({
  photos,
  baseId,
  targetId,
  onSelect,
  onDelete,
}: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5">
          <Film size={13} className="text-primary" />
          <p className="text-2xs font-bold uppercase tracking-[var(--ds-arbitrary-0-15em)] text-text-muted font-display">
            Oś czasu transformacji
          </p>
          <span className="text-3xs font-bold text-text-muted font-mono">({photos.length})</span>
        </div>
        <p className="text-3xs font-semibold text-text-muted uppercase tracking-wider">
          Wybierz 2 zdjęcia do porównania
        </p>
      </div>

      <div
        className="flex gap-2.5 overflow-x-auto pb-2 pt-1 px-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-no-swipe-nav="true"
      >
        {photos.map((photo) => {
          const isBase = photo.id === baseId;
          const isTarget = photo.id === targetId;
          const hasAnalysis = !!photo.ai_analysis;
          const isSelected = isBase || isTarget;

          return (
            <div key={photo.id} className="snap-start shrink-0 space-y-1.5 group">
              <div
                onClick={() => onSelect(photo.id)}
                className={`relative w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                  isBase
                    ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                    : isTarget
                    ? 'border-primary scale-105 shadow-md shadow-primary/25 ring-2 ring-primary/20'
                    : 'border-border-custom opacity-70 hover:opacity-100 hover:border-text-muted/40 hover:scale-[1.02]'
                }`}
              >
                <img
                  src={photo.thumbnail_url || photo.image_url}
                  alt={`Zdjęcie sylwetki z ${photo.date ? format(parseISO(photo.date), 'dd.MM.yyyy') : ''}`}
                  className={`w-full h-full object-cover ui-interactive ${
                    !isSelected ? 'grayscale-[0.35]' : ''
                  }`}
                  loading="lazy"
                />

                {hasAnalysis && (
                  <div className="absolute top-1 right-1 bg-primary/90 text-on-accent p-0.5 rounded-full shadow-sm">
                    <Sparkles size={9} />
                  </div>
                )}

                {isSelected && (
                  <div className="absolute inset-0 flex items-end justify-center pb-1.5 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                    <span
                      className={`text-3xs font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-sm border shadow-sm ${
                        isBase
                          ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                          : 'bg-primary/90 text-on-accent border-primary/40'
                      }`}
                    >
                      {isBase ? 'Baza' : 'Cel'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center px-0.5">
                <span
                  className={`text-3xs font-mono font-bold ${
                    isSelected ? 'text-primary' : 'text-text-secondary'
                  }`}
                >
                  {photo.date ? format(parseISO(photo.date), 'dd.MM') : '--'}
                </span>
                <Pressable
                  onClick={() => onDelete(photo.id, photo.image_url, photo.thumbnail_url)}
                  variant="ghost"
                  icon={<Trash2 size={10} />}
                  className="opacity-40 group-hover:opacity-100 text-text-muted hover:text-danger p-0.5 rounded transition-opacity"
                  title="Usuń zdjęcie"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
