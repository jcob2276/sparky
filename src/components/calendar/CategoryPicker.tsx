import React from 'react';
import { LIFE_SPHERES } from '../../lib/projects/lifeSpheres';
import { Pressable } from '../ui/ControlPrimitives';

interface CategoryPickerProps {
  selected: string | null;
  onSelect: (key: string | null) => void;
}

const SHORT_SPHERE_LABELS: Record<string, string> = {
  cialo_trening: 'Ciało',
  duch_refleksja: 'Refleksja',
  relacje_rodzina: 'Relacje',
  odpoczynek_regeneracja: 'Regeneracja',
};

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5 py-0.5">
      {[{ id: null as string | null, label: 'Brak', dot: 'bg-text-muted/50' }, ...LIFE_SPHERES].map((cat) => {
        const isSelected = selected === cat.id;
        const displayLabel = cat.id && SHORT_SPHERE_LABELS[cat.id] ? SHORT_SPHERE_LABELS[cat.id] : cat.label;
        return (
          <Pressable
            key={cat.id || 'none'}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ui-interactive select-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] ${
              isSelected
                ? cat.id
                  ? 'bg-primary/15 border-primary/50 text-primary font-bold shadow-2xs'
                  : 'bg-text-primary/15 border-text-primary/40 text-text-primary font-bold shadow-2xs'
                : 'border-border-custom/30 bg-surface-solid/35 text-text-muted hover:text-text-primary hover:border-border-custom/60'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dot}`} />
            <span>{displayLabel}</span>
          </Pressable>
        );
      })}
    </div>
  );
}
