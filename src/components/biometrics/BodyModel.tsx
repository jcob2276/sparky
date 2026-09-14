import { useMemo } from 'react';
import Model, { type IMuscleStats } from 'react-body-highlighter';
import { BODY_BASE, HEAT_SCALE, buildHighlighterData } from '../../lib/health/muscleMapData';

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
      style={{ width: 'var(--ds-inline-style-100)', padding: 'var(--ds-inline-style-0-5rem-0-25rem-0)' }}
      svgStyle={{ display: 'block', overflow: 'visible' }}
    />
  );
}
