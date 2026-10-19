/**
 * @component GeneralView
 * @role Pamięć Sparky ze źródłami i zalecenia.
 * @usedBy DesktopDashboard
 */
import { useGeneralViewData } from './hooks/useGeneralViewData';
import Skeleton from '../../ui/Skeleton';
import type { OuraRow } from '../desktopUtils';
import GeneralMemexPanels from './generalView/GeneralMemexPanels';
import GeneralRecommendationsPanel from './generalView/GeneralRecommendationsPanel';
import { Pressable } from '../../ui/ControlPrimitives';

export default function GeneralView({
  userId,
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
    isError,
    refetch,
  } = useGeneralViewData({ userId });

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="card" className="h-48 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  if (isError) return (
    <div role="alert" className="space-y-2 rounded-xl border border-border-custom p-4 text-sm text-text-muted">
      <p>Nie udało się pobrać pamięci Sparky.</p>
      <Pressable onClick={() => void refetch()} className="text-primary">Spróbuj ponownie</Pressable>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── SEKCJA: PAMIĘĆ SPARKY ── */}
      <div id="pamiec" className="scroll-mt-28 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="text-xs font-black uppercase tracking-widest text-text-muted">
          Pamięć
        </span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>

      <GeneralMemexPanels
        userId={userId}
        patterns={patterns}
        curiosity={curiosity}
        wiki={wiki}
      />

      {/* ── SEKCJA: ZALECENIA WYROCZNI ── */}
      <div className="flex items-center gap-3 mt-2">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="text-xs font-black uppercase tracking-widest text-text-muted">
          Zalecenia
        </span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>

      <GeneralRecommendationsPanel recommendations={recommendations} />
    </div>
  );
}
