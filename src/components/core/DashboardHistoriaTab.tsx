import { Suspense, memo, useEffect, useState } from 'react';
import { useSession } from '../../store/useStore';
import Skeleton from '../ui/Skeleton';
import Button from '../ui/Button';
import { BookOpen, BarChart3, Sparkles } from 'lucide-react';
import Stats from './Stats';
import StravaWidget from '../integrations/StravaWidget';
import Photos from '../identity/Photos';
import ChronicleControls from './chronicle/ChronicleControls';
import ChronicleAiCompare from './chronicle/ChronicleAiCompare';
import ChroniclePeriodPicker from './chronicle/ChroniclePeriodPicker';
import { periodLabel } from '../../lib/chronicle/periods';
import { subscribeChronicleIntent, takeChronicleIntent } from '../../lib/chronicle/chronicleIntent';
import ChronicleSummary from './chronicle/ChronicleSummary';
import ChronicleWeekStrip from './chronicle/ChronicleWeekStrip';
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
  const [viewMode, setViewMode] = useState<'summary' | 'stats'>('summary');
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
    <div className="min-h-full bg-background px-3.5 py-4 pb-36 sm:px-5">
      <div className="mx-auto max-w-xl space-y-4">
        
        {/* Pasek dni tygodnia */}
        <ChronicleWeekStrip userId={session.user.id} />

        {/* Kontrolki celu, okresu i eksportu */}
        <ChronicleControls
          goal={goal}
          onGoal={setGoal}
          period={period}
          onPeriod={(next) => { setPeriod(next); selection.reset(); }}
          onExport={() => setIsExportOpen(true)}
        />

        {/* Segmented Control: Dziennik/Wnioski vs Głębokie Metryki Ciała & Treningi */}
        <div className="flex rounded-full bg-surface-2 p-1 border border-border" role="tablist" aria-label="Widok kroniki">
          <Button
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={viewMode === 'summary'}
            onClick={() => setViewMode('summary')}
            className={`flex-1 min-h-9 rounded-full text-xs font-bold transition-all ${
              viewMode === 'summary'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            icon={<BookOpen size={14} />}
          >
            Podsumowanie & AI
          </Button>

          <Button
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={viewMode === 'stats'}
            onClick={() => setViewMode('stats')}
            className={`flex-1 min-h-9 rounded-full text-xs font-bold transition-all ${
              viewMode === 'stats'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            icon={<BarChart3 size={14} />}
          >
            Pomiary & Treningi
          </Button>
        </div>

        {/* Tryb 1: Podsumowanie, Oś Czasu i Analiza AI */}
        {viewMode === 'summary' && (
          <div className="space-y-4 animate-fadeIn">
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
          </div>
        )}

        {/* Tryb 2: Szczegółowe metryki ciała, zdjęcia sylwetki, bieganie (Strava) i siłownia */}
        {viewMode === 'stats' && (
          <div className="space-y-4 animate-fadeIn">
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
        )}

      </div>
    </div>
  );
});
