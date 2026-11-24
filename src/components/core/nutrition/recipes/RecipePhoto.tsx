import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface RecipePhotoProps {
  src?: string;
  className?: string;
}

/** Zdjęcie dania; bez zdjęcia lub gdy się nie wczyta, pokazuje spokojny zastępnik z ikoną. */
export default function RecipePhoto({ src, className = '' }: RecipePhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== undefined && src !== failedSrc;
  return (
    <span className={`flex items-center justify-center overflow-hidden bg-surface-2 ${className}`} aria-hidden="true">
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <UtensilsCrossed size={22} className="text-text-muted" />
      )}
    </span>
  );
}
