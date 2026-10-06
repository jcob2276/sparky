import { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface GalleryImage {
  src: string;
  alt: string;
  title: string;
  objectPosition?: string;
}

interface Props {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * LightboxGallery — dwupoziomowy lightbox:
 * 1. Grid overview — wszystkie zdjęcia jako kafelki
 * 2. Zoom view — kliknięty kafelek pełnoekranowo
 *
 * Zamknięcie: X lub klik poza galerią.
 */
export default function LightboxGallery({ images, initialIndex, onClose }: Props) {
  const [zoomed, setZoomed] = useState<number | null>(
    images.length === 1 ? 0 : null
  );

  // Blokuj scroll tła
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ESC zamyka
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomed !== null && images.length > 1) setZoomed(null);
        else onClose();
      }
      if (e.key === 'ArrowRight' && zoomed !== null)
        setZoomed((zoomed + 1) % images.length);
      if (e.key === 'ArrowLeft' && zoomed !== null)
        setZoomed((zoomed - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed, images.length, onClose]);

  // Kolumny gridu: 1 zdjęcie → full, 2 → 2 col, 3+ → 3 col
  const gridCols =
    images.length === 1 ? 'grid-cols-1' :
    images.length === 2 ? 'grid-cols-2' :
    'grid-cols-3';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-fadeIn"
      onClick={() => {
        if (zoomed !== null && images.length > 1) setZoomed(null);
        else onClose();
      }}
    >
      {/* Pasek nagłówka */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        {zoomed !== null && images.length > 1 ? (
          <button
            onClick={() => setZoomed(null)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs font-semibold tracking-wide uppercase"
          >
            <ArrowLeft size={14} />
            Galeria
          </button>
        ) : (
          <span className="text-xs font-black uppercase tracking-widest text-white/40">
            Wizja · {images.length} {images.length === 1 ? 'zdjęcie' : 'zdjęcia'}
          </span>
        )}

        <div className="flex items-center gap-3">
          {zoomed !== null && images.length > 1 && (
            <span className="text-xs font-bold text-white/40">
              {zoomed + 1} / {images.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Zamknij"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {zoomed === null && (
        <div
          className={`flex-1 overflow-y-auto p-3 grid ${gridCols} gap-2 content-start`}
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={img.src}
              onClick={() => setZoomed(idx)}
              className={`
                relative overflow-hidden rounded-2xl border border-white/10
                active:scale-[0.97] transition-transform duration-150 cursor-zoom-in
                ${images.length === 1 ? 'aspect-video' : 'aspect-square'}
                ${idx === initialIndex ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-black' : ''}
              `}
            >
              <img
                src={img.src}
                alt={img.alt}
                className={`w-full h-full object-cover ${img.objectPosition ?? 'object-center'}`}
                draggable={false}
              />
              {/* Etykieta na hover */}
              <div className="absolute inset-x-0 bottom-0 py-1.5 px-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200">
                <p className="text-3xs font-black uppercase tracking-widest text-white truncate">
                  {img.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Zoom view — pojedyncze zdjęcie */}
      {zoomed !== null && (
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-hidden"
          onClick={e => {
            e.stopPropagation();
            if (images.length > 1) setZoomed(null);
            else onClose();
          }}
        >
          <img
            src={images[zoomed].src}
            alt={images[zoomed].alt}
            className="max-w-full max-h-[75vh] rounded-2xl border border-white/15 shadow-2xl object-contain"
            draggable={false}
            onClick={e => e.stopPropagation()}
          />

          {/* Nawigacja prev/next (tylko gdy >1 zdjęcie) */}
          {images.length > 1 && (
            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setZoomed((zoomed - 1 + images.length) % images.length)}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold tracking-wide transition-colors"
              >
                ← Poprzednie
              </button>
              <span className="text-xs text-white/40 font-semibold">
                {images[zoomed].title}
              </span>
              <button
                onClick={() => setZoomed((zoomed + 1) % images.length)}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold tracking-wide transition-colors"
              >
                Następne →
              </button>
            </div>
          )}

          <p className="text-3xs font-semibold text-white/30 tracking-widest uppercase">
            {images.length > 1 ? 'Dotknij tła aby wrócić do galerii' : 'Dotknij gdziekolwiek aby zamknąć'}
          </p>
        </div>
      )}
    </div>
  );
}
