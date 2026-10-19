import { Maximize2, Sparkles } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { HeroImage } from './visionHeroData';

interface HeroThumbnailProps {
  images: HeroImage[];
  currentIndex: number;
  loaded: boolean;
  onLoaded: () => void;
  onOpen: () => void;
}

/** Miniatura zdjęcia hero (crossfade opacity przy rotacji). Drugie zdjęcie montuje się dopiero po załadowaniu pierwszego. */
export default function HeroThumbnail({ images, currentIndex, loaded, onLoaded, onOpen }: HeroThumbnailProps) {
  return (
    <Pressable
      onClick={onOpen}
      aria-label={`Otwórz galerię: ${images[currentIndex].title}`}
      className="hero-thumb relative shrink-0 overflow-hidden rounded-2xl bg-surface-2"
    >
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center bg-surface-2 animate-pulse">
          <Sparkles size={16} className="text-warning/40" />
        </span>
      )}
      {images.map((img, idx) =>
        idx === 0 || loaded ? (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            decoding="async"
            fetchPriority={idx === 0 ? 'high' : 'low'}
            loading={idx === 0 ? 'eager' : 'lazy'}
            onLoad={() => {
              if (idx === currentIndex) onLoaded();
            }}
            onError={(e) => {
              if (e.currentTarget.src !== '/dream_board_landscape.jpg') {
                e.currentTarget.src = '/dream_board_landscape.jpg';
              }
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
              idx === currentIndex && loaded ? 'opacity-100 z-10' : 'opacity-0 z-0'
            } ${img.objectPosition}`}
            draggable={false}
          />
        ) : null,
      )}
      <span className="absolute bottom-1 right-1 z-20 rounded-lg bg-black/50 p-1 text-white/90">
        <Maximize2 size={10} />
      </span>
    </Pressable>
  );
}
