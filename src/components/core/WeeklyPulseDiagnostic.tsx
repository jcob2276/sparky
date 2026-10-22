import { useUserId } from '../../store/useStore';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useWeeklyWinsMap } from '../../lib/weeklyWinsMap';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import DataStateNotice from './DataStateNotice';

export default function WeeklyPulseDiagnostic() {
  const userId = useUserId() ?? '';
  const bodyPulse = useWeeklyBodyPulse(userId);
  const winsMap = useWeeklyWinsMap(userId);

  if (!userId) return null;
  if (bodyPulse.isLoading || winsMap.isLoading) return <DataStateNotice tone="loading" title="Ładuję podsumowanie tygodnia" />;
  if (bodyPulse.isError || winsMap.isError) return <DataStateNotice tone="warning" title="Podsumowanie tygodnia niedostępne" detail={bodyPulse.error?.message ?? winsMap.error?.message ?? 'Nie udało się odczytać źródeł tygodnia.'} />;

  const data = bodyPulse.data;
  const wins = winsMap.data?.filter((d) => d.status === 'win').length ?? 0;
  const daysActive = winsMap.data?.filter((d) => d.doneCount > 0 || d.plannedCount > 0).length ?? 0;

  const hasBodyEvidence = data && (data.sleepAvgHours != null || data.averageRecovery != null || data.gymCount > 0 || data.runCount > 0 || data.saunaCount > 0);
  if (!hasBodyEvidence && daysActive === 0) return <DataStateNotice title="Za mało zapisów do syntezy tygodnia" detail="Brakuje pomiarów ciała, zapisanych treningów i aktywnych dni w zadaniach." />;

  const sleepLow = data?.sleepAvgHours != null && data.sleepAvgHours < 6.5;
  const recoveryLow = data?.averageRecovery != null && data.averageRecovery < 65;
  const runningHigh = (data?.runKm ?? 0) >= 20;
  const gymZero = (data?.gymCount ?? 0) === 0;
  const winsLow = wins <= 3 && daysActive >= 4;

  let message: string;
  let isWarning = false;

  if (sleepLow && recoveryLow) {
    isWarning = true;
    message = 'Ciężki tydzień dla organizmu: sen krótszy, a regeneracja niska. Odpuść mocne bodźce i zadbaj o wieczory.';
  } else if (runningHigh && gymZero) {
    message = 'Dużo biegania i ani jednej siłowni. Dołóż regenerację i jedną sesję siły.';
  } else if (winsLow) {
    isWarning = true;
    message = 'Mało dni z domkniętym 5/5. Skup się na kluczowych priorytetach dnia.';
  } else {
    message = 'Tydzień idzie w normalnym rytmie — szczegóły poniżej.';
  }

  return (
    <div
      className={`rounded-2xl border px-3.5 py-2.5 text-xs font-semibold leading-snug transition-all ${
        isWarning
          ? 'border-warning/30 bg-warning/[0.07] text-text-primary'
          : 'border-primary/25 bg-primary/[0.04] text-text-primary'
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isWarning ? (
            <AlertTriangle size={14} className="shrink-0 text-warning" />
          ) : (
            <CheckCircle2 size={14} className="shrink-0 text-primary" />
          )}
          <p className="leading-snug">{message}</p>
        </div>
      </div>

    </div>
  );
}
