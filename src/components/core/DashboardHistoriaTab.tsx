import { Suspense, memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSession } from '../../store/useStore';
import { Pressable } from '../ui/ControlPrimitives';
import Skeleton from '../ui/Skeleton';
import Stats from './Stats';
import StravaWidget from '../integrations/StravaWidget';
import Photos from '../identity/Photos';
import ChronicleControls from './chronicle/ChronicleControls';
import ChroniclePeriodPicker from './chronicle/ChroniclePeriodPicker';
import { periodLabel } from '../../lib/chronicle/periods';
import ChronicleSummary from './chronicle/ChronicleSummary';
import { useChronicle } from './chronicle/useChronicle';
import { useChronicleSelection } from './chronicle/useChronicleSelection';
import type { ChroniclePeriod } from '../../lib/chronicle/periods';
import type { ChronicleGoal } from '../../lib/chronicle/summaryTypes';

function ViewFallback() {
  return (
    <Skeleton variant="block" className="min-h-[var(--ds-h-220px)]" />
  );
}

export const DashboardHistoriaTab = memo(function DashboardHistoriaTab() {
  const session = useSession();
  const [goal, setGoal] = useState<ChronicleGoal>('cialo');
  const [period, setPeriod] = useState<ChroniclePeriod>('week');
  const [showTraining, setShowTraining] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const selection = useChronicleSelection();
  const chronicle = useChronicle(goal, period, selection.offset, selection.compareOffset);

  if (!session) return null;

  const periodTitle = chronicle.window.title;

  return (
    <div className="p-4 sm:p-5 pb-8 space-y-4">
      <ChronicleControls
        goal={goal}
        onGoal={setGoal}
        period={period}
        onPeriod={(next) => { setPeriod(next); selection.reset(); }}
        onExport={() => setIsExportOpen(true)}
      />

      {period !== 'sprint' && (
        <ChroniclePeriodPicker
          label={periodLabel(chronicle.window)}
          compareLabel={chronicle.window.compareLabel}
          isCurrent={selection.offset === 0}
          canCompareNewer={selection.compareOffset > 0}
          onShift={selection.shiftMain}
          onShiftCompare={selection.shiftCompare}
          onReset={selection.reset}
        />
      )}

      <ChronicleSummary
        summary={chronicle.summary}
        loading={chronicle.loading}
        error={chronicle.error}
        periodTitle={periodTitle}
        compareLabel={chronicle.window.compareLabel}
        showChart={period !== 'week'}
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
