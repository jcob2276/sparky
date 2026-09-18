/**
 * @component GeneralView
 * @role Uniwersalny widok ogólny (health charts, friction, memex, rekomendacje).
 * @folders generalView/ = GeneralHealthCharts, GeneralFrictionPanels, GeneralMemexPanels,
 *          GeneralRecommendationsPanel, ScoreBar, generalViewUtils | hooks/ = useGeneralViewData,
 *          useHexagonScores
 * @usedBy DesktopDashboard
 */
import { useGeneralViewData } from './hooks/useGeneralViewData';
import Skeleton from '../../ui/Skeleton';
import { C, OuraRow } from '../desktopUtils';
import GeneralMemexPanels from './generalView/GeneralMemexPanels';
import GeneralRecommendationsPanel from './generalView/GeneralRecommendationsPanel';

export default function GeneralView({
  userId,
  oura: ouraProp,
}: {
  userId: string;
  oura?: OuraRow[];
}) {
  const {
    patterns,
    wiki,
    curiosity,
    recommendations,
    loading,
  } = useGeneralViewData({ userId, ouraProp });

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="card" className="h-48 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── SEKCJA: MEMEX ── */}
      <div id="pamiec" className="scroll-mt-28 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="text-xs font-black uppercase tracking-widest text-text-muted">
          Memex — Pamięć systemu
        </span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>

      <GeneralMemexPanels
        patterns={patterns}
        curiosity={curiosity}
        wiki={wiki}
        emeraldColor={C.emerald}
      />

      {/* ── SEKCJA: ZALECENIA WYROCZNI ── */}
      <div className="flex items-center gap-3 mt-2">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="text-xs font-black uppercase tracking-widest text-text-muted">
          Zalecenia Wyroczni
        </span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>

      <GeneralRecommendationsPanel recommendations={recommendations} />
    </div>
  );
}
