import { Suspense, memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSession } from '../../store/useStore';
import { Pressable } from '../ui/ControlPrimitives';
import Spinner from '../ui/Spinner';
import Stats from './Stats';
import StravaWidget from '../integrations/StravaWidget';
import Photos from '../identity/Photos';
import ChronicleControls from './chronicle/ChronicleControls';
import ChronicleSummary from './chronicle/ChronicleSummary';
import { useChronicle } from './chronicle/useChronicle';
import type { ChroniclePeriod } from '../../lib/chronicle/periods';
import type { ChronicleGoal } from '../../lib/chronicle/summaryTypes';

function ViewFallback() {
  return (
    <div className="flex min-h-[var(--ds-h-220px)] items-center justify-center rounded-lg border border-on-accent/[0.06] bg-on-accent/[0.02]">
      <Spinner size="md" />
    </div>
  );
}

export const DashboardHistoriaTab = memo(function DashboardHistoriaTab() {
  const session = useSession();
  const [goal, setGoal] = useState<ChronicleGoal>('cialo');
  const [period, setPeriod] = useState<ChroniclePeriod>('week');
  const [showTraining, setShowTraining] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const chronicle = useChronicle(goal, period);

  if (!session) return null;

  const periodTitle = chronicle.window.title;

  return (
    <div className="p-4 sm:p-5 pb-8 space-y-4">
      <ChronicleControls
        goal={goal}
        onGoal={setGoal}
        period={period}
        onPeriod={setPeriod}
        onExport={() => setIsExportOpen(true)}
      />

      <ChronicleSummary
        summary={chronicle.summary}
        loading={chronicle.loading}
        error={chronicle.error}
        periodTitle={periodTitle}
      />

      <Suspense fallback={<ViewFallback />}>
        <Stats
          domain={goal === 'cialo' ? (showTraining ? 'all' : 'body') : 'none'}
          photosSlot={<Photos />}
          runningSlot={<StravaWidget />}
          isExportOpen={isExportOpen}
          onCloseExport={() => setIsExportOpen(false)}
          onOpenExport={() => setIsExportOpen(true)}
        />
      </Suspense>

      {goal === 'cialo' && (
        <Pressable
          aria-expanded={showTraining}
          onClick={() => setShowTraining((value) => !value)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border-custom/60 bg-surface/50 py-2.5 text-xs font-bold text-text-secondary ui-interactive active:scale-95 cursor-pointer"
        >
          <ChevronDown size={14} aria-hidden="true" className={showTraining ? 'rotate-180' : ''} />
          {showTraining ? 'Ukryj treningi' : 'Pokaż treningi (siłownia, biegi)'}
        </Pressable>
      )}
    </div>
  );
});
