import { useUserId } from '../../store/useStore';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useWeeklyWinsMap } from '../../lib/weeklyWinsMap';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { useWeeklyPulseSynthesis } from '../../hooks/useWeeklyPulseSynthesis';
import DataStateNotice from './DataStateNotice';

export default function WeeklyPulseDiagnostic() {
  const userId = useUserId() ?? '';
  const bodyPulse = useWeeklyBodyPulse(userId);
  const winsMap = useWeeklyWinsMap(userId);

  const { analysis: aiAnalysis, loading: loadingAi, show: showAi, request: requestSynthesis } = useWeeklyPulseSynthesis(userId);

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
    message = `W zapisach występują krótszy sen (śr. ${data?.sleepAvgHours?.toFixed(1) ?? '—'}h) i niższy wynik regeneracji (${data?.averageRecovery ?? '—'}). Samo współwystępowanie nie ustala przyczyny.`;
  } else if (runningHigh && gymZero) {
    message = `Mocna objętość biegowa (${data?.runKm.toFixed(1)} km w 7 dni), brak sesji siłowej. Zadbaj o regenerację.`;
  } else if (winsLow) {
    isWarning = true;
    message = `Dyscyplina 5/5 na poziomie ${wins}/7 dni — skup się na domknięciu kluczowych priorytetów dnia.`;
  } else {
    message = `Zapisane treningi: ${data?.gymCount ?? '—'} siłowych i ${data?.runCount ?? '—'} biegowych. Domknięte dni: ${wins}/${daysActive}.`;
  }

  const fetchAiAnalysis = async () => {
    const prompt = `Przeanalizuj w 2 konkretnych, ostrych zdaniach stan tego tygodnia w Sparky:
- Średni sen: ${data?.sleepAvgHours?.toFixed(1) ?? '—'}h
- Dzienny status ostrzegawczy: ${data?.warningDays ?? '—'} dni (nie jest to liczba nocy z deficytem snu)
- Bieganie: ${data?.runKm ?? 0} km (${data?.runCount ?? 0} treningów), Siłownia: ${data?.gymCount ?? 0}
- Średnia regeneracja: ${data?.averageRecovery ?? '—'}
- Dyscyplina 5/5: ${wins}/7 wygranych dni
Zwróć 2 zdania syntezy behawioralnej: co jest wzorcem tygodnia i jaka jest dźwignia na finisz. Bez wstępów.`;
    await requestSynthesis(prompt);
  };

  return (
    <div
      className={`rounded-2xl border px-3.5 py-2.5 text-xs font-semibold leading-snug space-y-2 transition-all ${
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
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => void fetchAiAnalysis()}
          disabled={loadingAi}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-3xs font-black uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors shrink-0"
        >
          <Sparkles size={11} className={loadingAi ? 'animate-spin' : ''} />
          {loadingAi ? 'Synteza…' : aiAnalysis ? (showAi ? 'Zwiń' : 'AI') : '✨ AI Diagnoza'}
        </Button>
      </div>

      {showAi && aiAnalysis && (
        <div className="rounded-xl border border-primary/20 bg-surface/90 p-2.5 text-xs leading-relaxed space-y-1">
          <p className="flex items-center gap-1.5 text-3xs font-black uppercase tracking-wider text-primary">
            <Sparkles size={10} /> Sparky AI Insight
          </p>
          <p className="font-medium text-text-primary">{aiAnalysis}</p>
        </div>
      )}
    </div>
  );
}
