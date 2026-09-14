import { Pressable } from '../../ui/ControlPrimitives';
import { MATRIX_LAYERS } from './multiDomainMatrixLayers';
import type { MatrixLayerId } from './multiDomainMatrixTypes';

interface Props {
  selectedLayers: Set<MatrixLayerId>;
  onToggleLayer: (layerId: MatrixLayerId) => void;
}

export function MultiDomainMatrixToggles({
  selectedLayers,
  onToggleLayer,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-2xs font-bold uppercase tracking-wider text-text-muted mr-1">
        Warstwy:
      </span>
      {MATRIX_LAYERS.map(layer => {
        const isSelected = selectedLayers.has(layer.id);
        return (
          <Pressable
            key={layer.id}
            onClick={() => onToggleLayer(layer.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
              isSelected
                ? `${layer.badgeClass} shadow-sm ring-1 ring-white/10`
                : 'border-border-custom/50 bg-surface/30 text-text-muted hover:border-border-custom hover:text-text-secondary opacity-60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSelected ? layer.colorClass : 'bg-text-muted/40'
              }`}
            />
            <span>{layer.label}</span>
          </Pressable>
        );
      })}
    </div>
  );
}
