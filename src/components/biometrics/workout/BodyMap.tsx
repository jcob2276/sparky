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
      return 'fill-rose-500/85 stroke-rose-500 hover:fill-rose-500';
    case 3:
      return 'fill-orange-500/70 stroke-orange-500 hover:fill-orange-500';
    case 2:
      return 'fill-amber-500/55 stroke-amber-500 hover:fill-amber-500';
    case 1:
      return 'fill-emerald-500/40 stroke-emerald-500 hover:fill-emerald-500';
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
}: {
  view: SvgViewData;
  levels: Record<SvgMuscle, number>;
  selectedMuscle?: SvgMuscle | null;
  onSelectMuscle?: (m: SvgMuscle) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xs font-black uppercase tracking-widest text-text-muted/70 mb-1">
        {label}
      </span>
      <svg
        viewBox={view.vb}
        className="w-36 sm:w-44 h-auto select-none transition-all"
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
                className={`transition-colors duration-150 cursor-pointer stroke-[1.5] ${shadeCls}`}
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
  className = '',
}: BodyMapProps) {
  const paths = useBodyGeometry();
  const levels = calculateSvgMuscleLevels(fatigueByTag);

  if (!paths) {
    return (
      <div className={`h-64 flex items-center justify-center text-xs text-text-muted animate-pulse ${className}`}>
        Ładowanie mapy anatomii...
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center bg-surface/30 border border-border-custom rounded-2xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-3">
        <div className="text-2xs font-black uppercase tracking-wider text-text-secondary">
          Mapa Zmęczenia Anatomicznego
        </div>
      </div>

      {/* Front & Back SVG Views */}
      <div className="flex items-center justify-center gap-6 w-full">
        <SingleBodyView
          view={paths.front}
          levels={levels}
          selectedMuscle={selectedMuscle}
          onSelectMuscle={onSelectMuscle}
          label="Przód"
        />
        <SingleBodyView
          view={paths.back}
          levels={levels}
          selectedMuscle={selectedMuscle}
          onSelectMuscle={onSelectMuscle}
          label="Tył"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border-custom/50 w-full text-3xs font-bold text-text-muted">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-text-muted/20 border border-border-custom" />
          <span>Świeży</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-success/50 border border-success" />
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
