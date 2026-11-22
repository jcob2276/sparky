import { useMemo } from 'react';
import Model, { type IMuscleStats } from 'react-body-highlighter';
import { BODY_BASE, HEAT_SCALE, buildHighlighterData } from '../../lib/health/muscleMapData';

const BODY_STYLE = { width: '100%', padding: '0.25rem 0.25rem 0.5rem' } as const;
const BODY_SVG_STYLE = { display: 'block', overflow: 'visible', maxHeight: '220px', width: 'auto', margin: '0 auto' } as const;

export default function BodyModel({
  view,
  loadByTag,
  onMuscleClick,
}: {
  view: 'anterior' | 'posterior';
  loadByTag: Record<string, number>;
  onMuscleClick: (stats: IMuscleStats) => void;
}) {
  const data = useMemo(() => buildHighlighterData(loadByTag, view), [loadByTag, view]);

  return (
    <Model
      type={view}
      data={data}
      bodyColor={BODY_BASE}
      highlightedColors={[...HEAT_SCALE]}
      onClick={onMuscleClick}
      style={BODY_STYLE}
      svgStyle={BODY_SVG_STYLE}
    />
  );
}
