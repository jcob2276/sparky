import { Heart } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';

interface FavoriteButtonProps {
  active: boolean;
  title: string;
  onToggle: () => void;
  className?: string;
}

export default function FavoriteButton({ active, title, onToggle, className = '' }: FavoriteButtonProps) {
  return (
    <Pressable
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? `Usuń z ulubionych: ${title}` : `Dodaj do ulubionych: ${title}`}
      className={`grid h-11 w-11 place-items-center rounded-full bg-surface/80 ${active ? 'text-danger' : 'text-text-secondary'} ${className}`}
    >
      <Heart size={18} aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
    </Pressable>
  );
}
