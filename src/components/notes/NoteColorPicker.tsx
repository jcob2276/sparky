import { COLORS } from './keepUtils';
import { Pressable } from '../ui/ControlPrimitives';
import { Check } from 'lucide-react';

interface NoteColorPickerProps {
  currentColor: string;
  onSelectColor: (color: string) => void;
  className?: string;
}

export default function NoteColorPicker({ currentColor, onSelectColor, className = '' }: NoteColorPickerProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 p-1.5 ${className}`} role="radiogroup" aria-label="Wybierz kolor notatki">
      {COLORS.map((c) => {
        const isSelected = currentColor === c.id;
        return (
          <Pressable
            key={c.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={c.label}
            title={c.label}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(c.id);
            }}
            className="h-5 w-5 rounded-full border border-border-custom/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xs"
            style={{ backgroundColor: c.dot }}
          >
            {isSelected && (
              <Check size={11} className="text-scrim drop-shadow-xs" strokeWidth={3} />
            )}
          </Pressable>
        );
      })}
    </div>
  );
}
