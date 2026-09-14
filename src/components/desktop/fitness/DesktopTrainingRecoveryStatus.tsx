import { Heart, Zap, Activity, Smartphone, Moon } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { OuraRow, StravaActivitySummary } from '../desktopUtils';
import { daysBefore } from '../desktopUtils';
import type { StrainData } from '../hero/CockpitBanner';
import type { PhoneUsageRow } from '../../../lib/desktopDashboardTypes';

interface Props {
  oura: OuraRow[];
  strain?: StrainData | null;
  strava?: StravaActivitySummary[];
  phoneUsage?: PhoneUsageRow[];
}

export default function DesktopTrainingRecoveryStatus({
  oura,
  strain,
  strava = [],
  phoneUsage = [],
}: Props) {
  // 1. Latest Oura metrics
  const latestOura = oura[oura.length - 1] ?? null;
  const prevOura = oura.slice(-8, -1);
  const avgHrv7d = prevOura.length
    ? Math.round(
        prevOura.reduce((acc, o) => acc + (o.hrv_avg || 0), 0) / (prevOura.filter(o => o.hrv_avg).length || 1)
      )
    : null;

  const currentHrv = latestOura?.hrv_avg ?? null;
  const hrvDelta = currentHrv && avgHrv7d ? currentHrv - avgHrv7d : null;
  const readiness = latestOura?.readiness_score ?? 78;
  const rhr = latestOura?.rhr_avg ?? null;

  // 2. Polish formatting for Status & Limiter
  const statusLabel =
    strain?.daily_status === 'green'
      ? 'Pełna gotowość'
      : strain?.daily_status === 'yellow'
      ? 'Umiarkowany'
      : strain?.daily_status === 'red'
      ? 'Tryb ochronny'
      : 'Aktywny';

  const limiterMap: Record<string, string> = {
    sleep: 'Niedobór snu',
    readiness: 'Regeneracja OUN',
    cns: 'Układ nerwowy',
    recovery: 'Zmęczenie układu',
    strain: 'Przeciążenie treningowe',
    activity: 'Wysoka aktywność',
  };

  const rawLimiter = strain?.main_limiter?.toLowerCase() || '';
  const limiterLabel = rawLimiter ? (limiterMap[rawLimiter] || strain?.main_limiter || 'Optymalnie') : 'Optymalnie';

  const statusColor =
    strain?.daily_status === 'green' || readiness >= 80
      ? 'text-success'
      : strain?.daily_status === 'red' || readiness < 65
      ? 'text-danger'
      : 'text-warning';

  const readinessVerdict =
    readiness >= 80
      ? 'Zielone światło na mocny trening'
      : readiness >= 70
      ? 'Dobra forma — optymalne obciążenie'
      : 'Układ nerwowy zmęczony — lżejsza sesja';

  // 3. ACWR (Acute:Chronic Workload Ratio) from Strava
  const since7d = daysBefore(7);
  const since28d = daysBefore(28);
  const runs = strava.filter((s) => (s.sport_type || '').toLowerCase().includes('run'));
  const km7d = runs
    .filter((s) => s.start_date.slice(0, 10) >= since7d)
    .reduce((sum, s) => sum + (Number(s.distance) || 0) / 1000, 0);
  const km28d = runs
    .filter((s) => s.start_date.slice(0, 10) >= since28d)
    .reduce((sum, s) => sum + (Number(s.distance) || 0) / 1000, 0);

  const avgWeekly28d = km28d > 0 ? km28d / 4 : km7d > 0 ? km7d : 1;
  const acwr = Math.round((km7d / avgWeekly28d) * 100) / 100;

  // 4. Latest Phone Usage
  const latestPhone = phoneUsage[phoneUsage.length - 1] ?? null;
  const totalScreenMins = latestPhone?.total_minutes ?? 0;
  const lateNightMins = latestPhone?.late_night_minutes ?? 0;
  const unlocks = latestPhone?.unlocks ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <CnsCard
        readiness={readiness}
        currentHrv={currentHrv}
        hrvDelta={hrvDelta}
        rhr={rhr}
        statusColor={statusColor}
        readinessVerdict={readinessVerdict}
      />
      <LimiterCard
        statusLabel={statusLabel}
        statusColor={statusColor}
        limiterLabel={limiterLabel}
        rawLimiter={rawLimiter}
        strainScore={strain?.strain_score != null ? Math.round(strain.strain_score) : null}
      />
      <AcwrCard
        km7d={km7d}
        acwr={acwr}
        totalRuns={runs.length}
      />
      <ScreenTimeCard
        totalMinutes={totalScreenMins}
        lateNightMinutes={lateNightMins}
        unlocks={unlocks}
      />
    </div>
  );
}

function CnsCard({
  readiness,
  currentHrv,
  hrvDelta,
  rhr,
  statusColor,
  readinessVerdict,
}: {
  readiness: number;
  currentHrv: number | null;
  hrvDelta: number | null;
  rhr: number | null;
  statusColor: string;
  readinessVerdict: string;
}) {
  return (
    <Card variant="surface" padding="1rem" className="border-border-custom bg-surface/30 space-y-2">
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Heart size={13} className="text-danger" />
          OUN & Gotowość
        </span>
        <span className={`font-black ${statusColor}`}>{readiness}/100</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-text-primary leading-none">
            {currentHrv ? `${currentHrv} ms` : '—'}
          </span>
          {hrvDelta !== null && (
            <span className={`text-2xs font-bold ${hrvDelta >= 0 ? 'text-success' : 'text-danger'}`}>
              {hrvDelta >= 0 ? `+${hrvDelta}` : hrvDelta} vs 7d
            </span>
          )}
          {rhr !== null && (
            <span className="text-3xs text-text-muted font-mono">
              · RHR {rhr} bpm
            </span>
          )}
        </div>
        <p className="text-3xs text-text-muted mt-1 leading-snug truncate" title={readinessVerdict}>
          {readinessVerdict}
        </p>
      </div>
    </Card>
  );
}

function LimiterCard({
  statusLabel,
  statusColor,
  limiterLabel,
  rawLimiter,
  strainScore,
}: {
  statusLabel: string;
  statusColor: string;
  limiterLabel: string;
  rawLimiter: string;
  strainScore: number | null;
}) {
  return (
    <Card variant="surface" padding="1rem" className="border-border-custom bg-surface/30 space-y-2">
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Zap size={13} className="text-warning" />
          Stan Dnia & Obciążenie
        </span>
        <span className={`font-mono text-3xs uppercase font-bold ${statusColor}`}>{statusLabel}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-text-primary leading-none">{limiterLabel}</span>
          {strainScore !== null && (
            <span className="text-2xs font-bold text-text-muted">
              Strain {strainScore}
            </span>
          )}
        </div>
        <p className="text-3xs text-text-muted mt-1 leading-snug">
          {rawLimiter
            ? `Główny limiter: ${limiterLabel} · Zadbaj o regenerację`
            : 'Układ zrównoważony — gotowy do adaptacji'}
        </p>
      </div>
    </Card>
  );
}

function AcwrCard({
  km7d,
  acwr,
  totalRuns,
}: {
  km7d: number;
  acwr: number;
  totalRuns: number;
}) {
  const isHighRisk = acwr > 1.4;
  const isOptimal = acwr >= 0.8 && acwr <= 1.4;
  const acwrColor = isHighRisk ? 'text-warning' : isOptimal ? 'text-success' : 'text-primary';
  const acwrLabel = isHighRisk
    ? 'Wzrost obciążenia (uwaga na stawy)'
    : isOptimal
    ? 'Strefa optymalnej adaptacji'
    : 'Świeżość / deload';

  return (
    <Card variant="surface" padding="1rem" className="border-border-custom bg-surface/30 space-y-2">
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={13} className="text-primary" />
          Świeżość Biegowa
        </span>
        <span className={`font-mono text-3xs font-bold ${acwrColor}`}>
          ACWR {totalRuns > 0 ? acwr.toFixed(2) : '1.00'}
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-text-primary leading-none">
            {km7d > 0 ? `${km7d.toFixed(1)} km` : '0 km'}
          </span>
          <span className="text-2xs text-text-muted">ostatnie 7 dni</span>
        </div>
        <p className="text-3xs text-text-muted mt-1 leading-snug">
          {acwrLabel}
        </p>
      </div>
    </Card>
  );
}

function ScreenTimeCard({
  totalMinutes,
  lateNightMinutes,
  unlocks,
}: {
  totalMinutes: number;
  lateNightMinutes: number;
  unlocks: number;
}) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const screenStr = totalMinutes > 0 ? `${hours}h ${mins}m` : '0h 00m';

  const isLateDanger = lateNightMinutes > 40;
  const isLateWarn = lateNightMinutes > 15;
  const lateColor = isLateDanger ? 'text-danger' : isLateWarn ? 'text-warning' : 'text-success';

  return (
    <Card variant="surface" padding="1rem" className="border-border-custom bg-surface/30 space-y-2">
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Smartphone size={13} className="text-info" />
          Screen Time & Dopamina
        </span>
        {lateNightMinutes > 0 ? (
          <span className={`flex items-center gap-1 font-mono text-3xs font-bold ${lateColor}`}>
            <Moon size={11} /> {lateNightMinutes}m noc
          </span>
        ) : (
          <span className="font-mono text-3xs text-success font-bold">Czysta noc</span>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-text-primary leading-none">{screenStr}</span>
          {unlocks > 0 && (
            <span className="text-2xs text-text-muted font-mono">{unlocks} odblokowań</span>
          )}
        </div>
        <p className="text-3xs text-text-muted mt-1 leading-snug">
          {lateNightMinutes > 0
            ? `${lateNightMinutes} min ekranu po 22:00 — hamowanie melatoniny`
            : 'Zero ekranu po 22:00 — wysoka regeneracja OUN'}
        </p>
      </div>
    </Card>
  );
}
