import { useState, useEffect } from 'react';
import {
  SVG_MUSCLES,
  INERT_BODY_PARTS,
  MUSCLE_PL_NAMES,
  calculateSvgMuscleLevels,
  type SvgMuscle,
} from '../../../lib/health/bodyMuscles';
import type { BodyPathsData, SvgViewData } from '../../../lib/health/bodyPaths';

interface BodyMapProps {
  fatigueByTag?: Record<string, number>;
  selectedMuscle?: SvgMuscle | null;
  onSelectMuscle?: (muscle: SvgMuscle) => void;
  /** Smaller figures + no card chrome — for hub home above the fold. */
  compact?: boolean;
  className?: string;
}

let cachedPaths: BodyPathsData | null = null;
let pendingPromise: Promise<BodyPathsData> | null = null;

function useBodyGeometry() {
  const [paths, setPaths] = useState<BodyPathsData | null>(cachedPaths);

  useEffect(() => {
    if (cachedPaths) return;
    let active = true;
    if (!pendingPromise) {
      pendingPromise = import('../../../lib/health/bodyPaths').then((m) => {
        cachedPaths = m.default;
        return cachedPaths;
      });
    }
    pendingPromise.then((p) => {
      if (active) setPaths(p);
    });
    return () => {
      active = false;
    };
  }, []);

  return paths;
}

function getShadeClass(level: number, isSelected: boolean): string {
  if (isSelected) {
    return 'fill-primary stroke-primary/80 drop-shadow-[0_0_8px_var(--color-primary)]';
  }
  switch (level) {
    case 4:
      return 'fill-danger/85 stroke-danger hover:fill-danger';
    case 3:
      return 'fill-warning/75 stroke-warning hover:fill-warning';
    case 2:
      return 'fill-warning/50 stroke-warning/80 hover:fill-warning/70';
    case 1:
      return 'fill-primary/45 stroke-primary hover:fill-primary/70';
    default:
      return 'fill-text-muted/15 stroke-border-custom/50 hover:fill-text-muted/30';
  }
}

function SingleBodyView({
  view,
  levels,
  selectedMuscle,
  onSelectMuscle,
  label,
  compact,
}: {
  view: SvgViewData;
  levels: Record<SvgMuscle, number>;
  selectedMuscle?: SvgMuscle | null;
  onSelectMuscle?: (m: SvgMuscle) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xs font-black uppercase tracking-widest text-text-muted/70 mb-1">
        {label}
      </span>
      <svg
        viewBox={view.vb}
        className={`${compact ? 'w-[5.5rem] sm:w-28' : 'w-36 sm:w-44'} h-auto select-none transition-all`}
        role="img"
      >
        {/* Inert silhouette paths */}
        {INERT_BODY_PARTS.map((part) =>
          (view.p[part] || []).map((d, i) => (
            <path
              key={`${part}-${i}`}
              d={d}
              className="fill-text-muted/10 stroke-border-custom/30 pointer-events-none"
            />
          ))
        )}

        {/* Anatomical Muscles */}
        {SVG_MUSCLES.map((muscle) =>
          (view.p[muscle] || []).map((d, i) => {
            const level = levels[muscle] || 0;
            const isSelected = selectedMuscle === muscle;
            const shadeCls = getShadeClass(level, isSelected);

            return (
              <path
                key={`${muscle}-${i}`}
                d={d}
                className={`transition-colors duration-[var(--motion-fast)] cursor-pointer stroke-2 ${shadeCls}`}
                onClick={() => onSelectMuscle?.(muscle)}
              >
                <title>{`${MUSCLE_PL_NAMES[muscle]}${level > 0 ? ` · Zmęczenie: Poziom ${level}/4` : ' · Zregenerowany'}`}</title>
              </path>
            );
          })
        )}
      </svg>
    </div>
  );
}

export default function BodyMap({
  fatigueByTag = {},
  selectedMuscle,
  onSelectMuscle,
  compact = false,
  className = '',
}: BodyMapProps) {
  const paths = useBodyGeometry();
  const levels = calculateSvgMuscleLevels(fatigueByTag);

  if (!paths) {
    return (
      <div className={`${compact ? 'h-36' : 'h-64'} flex items-center justify-center text-xs text-text-muted animate-pulse ${className}`}>
        Ładowanie mapy anatomii...
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center ${
        compact ? '' : 'bg-surface/30 border border-border-custom rounded-2xl p-4'
      } ${className}`}
    >
      {!compact && (
        <div className="flex items-center justify-between w-full mb-3">
          <div className="text-2xs font-black uppercase tracking-wider text-text-secondary">
            Mapa Zmęczenia Anatomicznego
          </div>
        </div>
      )}

      <div className={`flex items-center justify-center w-full ${compact ? 'gap-2' : 'gap-6'}`}>
        <SingleBodyView
          view={paths.front}
          levels={levels}
          selectedMuscle={selectedMuscle}
          onSelectMuscle={onSelectMuscle}
          label="Przód"
          compact={compact}
        />
        <SingleBodyView
          view={paths.back}
          levels={levels}
          selectedMuscle={selectedMuscle}
          onSelectMuscle={onSelectMuscle}
          label="Tył"
          compact={compact}
        />
      </div>

      <div
        className={`flex items-center justify-center gap-2.5 w-full text-3xs font-bold text-text-muted ${
          compact ? 'mt-2 pt-2' : 'mt-4 pt-3 border-t border-border-custom/50'
        }`}
      >
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-text-muted/20 border border-border-custom" />
          <span>Świeży</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-primary/50 border border-primary" />
          <span>Lekkie</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-warning/60 border border-warning" />
          <span>Średnie</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-danger/80 border border-danger" />
          <span>Maksymalne</span>
        </div>
      </div>
    </div>
  );
}
