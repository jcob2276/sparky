import type { DashboardData } from '../../lib/investments/dashboardService';
import { buildDashboardThesis, type ThesisTone } from '../../lib/investments/dashboardThesis';
import { Pressable } from '../ui/ControlPrimitives';

const TONE: Record<ThesisTone, string> = {
  neutral: 'text-text-primary', positive: 'text-success', negative: 'text-danger', warning: 'text-warning',
};

/** Teza dnia na górze pulpitu: nagłówek + cztery sygnały z kontekstem i źródłem, każdy prowadzi do zakładki. */
export function DashboardThesis({ data, onNavigateTab }: { data: DashboardData; onNavigateTab: (tab: string) => void }) {
  const thesis = buildDashboardThesis(data);
  return <section aria-label="Co dziś się zmieniło" className="space-y-3">
    <div className="px-1">
      <h2 className="text-lg font-semibold text-text-primary">Co dziś się zmieniło</h2>
      <p className="text-sm text-text-secondary">{thesis.headline}</p>
      {thesis.windowNote && <p className="mt-1 text-xs text-warning">{thesis.windowNote}</p>}
    </div>
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {thesis.points.map(point => <li key={point.key}>
        <Pressable type="button" onClick={() => onNavigateTab(point.tab)} aria-label={`${point.label}: ${point.text}. Otwórz zakładkę`}
          className="flex h-full min-h-28 w-full flex-col items-start gap-1 rounded-2xl bg-surface-1 p-4 text-left ring-1 ring-text-primary/5">
          <span className="text-xs font-medium text-text-muted">{point.label}</span>
          <span className={`ui-num text-lg font-semibold leading-tight ${TONE[point.tone]}`}>{point.text}</span>
          <span className="text-xs text-text-secondary">{point.context}</span>
          <span className="mt-auto text-2xs text-text-muted">źródło: {point.source}</span>
        </Pressable>
      </li>)}
    </ul>
  </section>;
}
