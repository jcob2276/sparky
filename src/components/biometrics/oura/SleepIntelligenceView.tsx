import { Moon, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import type { OuraHealthHubData } from './types';
import { SleepFactorsSection } from './SleepFactorsSection';
import { SleepRecoveryArchitecture } from './SleepRecoveryArchitecture';

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function SleepIntelligenceView({ data }: { data: OuraHealthHubData }) {
  const enhanced = data.enhanced;
  const oura = data.oura;
  const context = data.nightContext ?? data.todayContext;

  const totalSleepHours = enhanced?.total_sleep_hours ?? oura?.total_sleep_hours ?? 0;
  const totalSleepMinutes = Math.round(totalSleepHours * 60);
  const deepMinutes = Math.round((enhanced?.deep_sleep_hours ?? oura?.deep_sleep_hours ?? 0) * 60);
  const remMinutes = Math.round((enhanced?.rem_sleep_hours ?? oura?.rem_sleep_hours ?? 0) * 60);

  const readinessScore = oura?.readiness_score ?? enhanced?.readiness_score ?? 0;
  const sleepScore = oura?.sleep_score ?? enhanced?.sleep_score ?? 0;
  const avgHrv = enhanced?.sleep_average_hrv ? Math.round(enhanced.sleep_average_hrv) : null;
  const lowestHr = enhanced?.sleep_lowest_heart_rate ? Math.round(enhanced.sleep_lowest_heart_rate) : null;

  // Practical diagnosis synthesis
  const diagnosis = (() => {
    if (readinessScore >= 80) {
      return {
        title: 'Wysoka regeneracja i gotowość',
        desc: 'Układ przywspółczulny w pełni zregenerowany. Optymalny dzień na mocny trening siłowy lub trudne zadania umysłowe.',
        status: 'optimal',
      };
    }
    if (readinessScore >= 65) {
      return {
        title: 'Średnia regeneracja — umiarkowany wysiłek',
        desc: 'Organizm w normie, ale bez nadwyżki. Wykonaj planowy trening, unikaj bicia rekordów do upadku mięśniowego.',
        status: 'moderate',
      };
    }
    return {
      title: 'Obniżona regeneracja — zalecany lżejszy dzień',
      desc: 'Obciążenie układu nerwowego lub niedobór snu głębokiego. Dobry dzień na spacer, rozciąganie, saunę lub aktywną regenerację.',
      status: 'low',
    };
  })();

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner: Sleep & Readiness Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border-custom bg-surface-solid/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Gotowość</span>
            <Activity size={15} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {readinessScore > 0 ? readinessScore : '—'}
            </span>
            <span className="text-xs text-text-muted">/100</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            {readinessScore >= 75 ? 'Optymalna' : readinessScore >= 60 ? 'Umiarkowana' : 'Niska'}
          </p>
        </div>

        <div className="rounded-2xl border border-border-custom bg-surface-solid/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Sen całkowity</span>
            <Moon size={15} className="text-info" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-text-primary tracking-tight">
              {totalSleepMinutes > 0 ? formatMinutes(totalSleepMinutes) : '—'}
            </span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            Wynik snu: {sleepScore > 0 ? `${sleepScore}/100` : '—'}
          </p>
        </div>
      </div>

      {/* Practical Intelligence Synthesis Card */}
      <div className={`rounded-2xl border p-4 shadow-2xs ${
        diagnosis.status === 'optimal'
          ? 'border-success/30 bg-success/5'
          : diagnosis.status === 'moderate'
          ? 'border-warning/30 bg-warning/5'
          : 'border-danger/30 bg-danger/5'
      }`}>
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className={diagnosis.status === 'optimal' ? 'text-success mt-0.5 shrink-0' : 'text-warning mt-0.5 shrink-0'} />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              {diagnosis.title}
            </h3>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed font-medium">
              {diagnosis.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Practical Factors We Actually Track */}
      {context && <SleepFactorsSection context={context} />}

      {/* Section: Architecture of Recovery (Deep, REM, HRV, Lowest HR) */}
      <SleepRecoveryArchitecture
        deepMinutes={deepMinutes}
        remMinutes={remMinutes}
        totalSleepMinutes={totalSleepMinutes}
        avgHrv={avgHrv}
        lowestHr={lowestHr}
        formatMinutes={formatMinutes}
        hypnogramString={enhanced?.sleep_phase_5_min}
        sleepContributors={enhanced?.sleep_contributors as Record<string, number>}
      />

      {/* Practical Evening Action Items */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
          <CheckCircle2 size={14} /> Zalecenie na dziś wieczór
        </h4>
        <ul className="text-2xs text-text-secondary space-y-1.5 list-disc list-inside font-medium">
          <li>Odcięcie kofeiny najpóźniej do 14:00.</li>
          <li>Ostatni posiłek minimum 2.5 - 3h przed snem, by tętno spoczynkowe spadło przed północą.</li>
          <li>Zimna, zaciemniona sypialnia (18-19°C) dla wydłużenia fazy Deep Sleep.</li>
        </ul>
      </div>
    </div>
  );
}
