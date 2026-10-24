import { Suspense, memo, useEffect, useState } from 'react';
import { useSession } from '../../store/useStore';
import Skeleton from '../ui/Skeleton';
import Stats from './Stats';
import StravaWidget from '../integrations/StravaWidget';
import Photos from '../identity/Photos';
import ChronicleControls from './chronicle/ChronicleControls';
import ChronicleAiCompare from './chronicle/ChronicleAiCompare';
import ChroniclePeriodPicker from './chronicle/ChroniclePeriodPicker';
import { periodLabel } from '../../lib/chronicle/periods';
import { subscribeChronicleIntent, takeChronicleIntent } from '../../lib/chronicle/chronicleIntent';
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
  const [isExportOpen, setIsExportOpen] = useState(false);
  const selection = useChronicleSelection();
  const chronicle = useChronicle(goal, period, selection.offset, selection.compareOffset);
  const { apply } = selection;

  // Skrót z innej zakładki (np. Tydzień): ustaw cel, okres i porównanie, także gdy zamiar przyszedł przed zamontowaniem.
  useEffect(() => {
    const take = () => {
      const intent = takeChronicleIntent();
      if (!intent) return;
      setGoal(intent.goal);
      setPeriod(intent.period);
      apply(intent.offset, intent.compareOffset);
    };
    take();
    return subscribeChronicleIntent(take);
  }, [apply]);

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

      <ChronicleAiCompare
        a={{ label: periodTitle, start: chronicle.window.start, end: chronicle.window.end }}
        b={{ label: chronicle.window.compareLabel, start: chronicle.window.prevStart, end: chronicle.window.prevEnd }}
      />

      <Suspense fallback={<ViewFallback />}>
        <Stats
          domain={goal === 'cialo' ? 'all' : 'none'}
          photosSlot={<Photos />}
          runningSlot={<StravaWidget />}
          isExportOpen={isExportOpen}
          onCloseExport={() => setIsExportOpen(false)}
          onOpenExport={() => setIsExportOpen(true)}
        />
      </Suspense>

    </div>
  );
});
