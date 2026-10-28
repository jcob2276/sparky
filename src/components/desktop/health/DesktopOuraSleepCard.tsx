import { Moon, ArrowUpRight, Clock } from 'lucide-react';
import Skeleton from '../../ui/Skeleton';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { useDailyStrainOura } from '../../../lib/biometricsApi';

function formatMinsToHours(mins: number | null | undefined): string {
  if (mins == null || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m > 0 ? `${m}m` : ''}`;
}

interface StageBarProps {
  deepMins: number | null;
  remMins: number | null;
  lightMins: number;
  awakeMins: number | null;
  totalBar: number;
  latencyMins: number | null;
}

function OuraNightStageBar({ deepMins, remMins, lightMins, awakeMins, totalBar, latencyMins }: StageBarProps) {
  if (totalBar <= 0) return null;
  return (
    <div className="space-y-1.5 rounded-xl border border-border-custom/50 bg-surface-2/30 p-3">
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span>Fazy snu</span>
        {latencyMins != null && (
          <span className="flex items-center gap-1">
            <Clock size={10} /> Zasypianie: <strong className="text-text-secondary">{latencyMins} min</strong>
          </span>
        )}
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
        {deepMins && deepMins > 0 && (
          <div
            className="bg-primary"
            style={{ width: `${Math.round((deepMins / totalBar) * 100)}%` }}
            title={`Głęboki: ${deepMins} min`}
          />
        )}
        {remMins && remMins > 0 && (
          <div
            className="bg-info"
            style={{ width: `${Math.round((remMins / totalBar) * 100)}%` }}
            title={`REM: ${remMins} min`}
          />
        )}
        {lightMins > 0 && (
          <div
            className="bg-text-muted/40"
            style={{ width: `${Math.round((lightMins / totalBar) * 100)}%` }}
            title={`Lekki: ${lightMins} min`}
          />
        )}
        {awakeMins && awakeMins > 0 && (
          <div
            className="bg-warning/50"
            style={{ width: `${Math.round((awakeMins / totalBar) * 100)}%` }}
            title={`Czuwanie: ${awakeMins} min`}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-2xs text-text-muted pt-1">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Głęboki {deepMins ?? 0}m</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-info" /> REM {remMins ?? 0}m</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" /> Lekki {lightMins}m</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warning/50" /> Czuwanie {awakeMins ?? 0}m</span>
      </div>
    </div>
  );
}

export default function DesktopOuraSleepCard({ userId }: { userId: string }) {
  const { data: ouraData, isLoading } = useDailyStrainOura(userId);

  const enhanced = ouraData?.enhanced;
  const oura = ouraData?.oura;

  const totalSleepMins = enhanced?.main_sleep_hours != null
    ? Math.round(Number(enhanced.main_sleep_hours) * 60)
    : oura?.total_sleep_hours != null
    ? Math.round(Number(oura.total_sleep_hours) * 60)
    : null;

  const deepMins = enhanced?.deep_sleep_hours != null
    ? Math.round(Number(enhanced.deep_sleep_hours) * 60)
    : oura?.deep_sleep_hours != null
    ? Math.round(Number(oura.deep_sleep_hours) * 60)
    : null;

  const remMins = enhanced?.rem_sleep_hours != null
    ? Math.round(Number(enhanced.rem_sleep_hours) * 60)
    : oura?.rem_sleep_hours != null
    ? Math.round(Number(oura.rem_sleep_hours) * 60)
    : null;

  const awakeMins = enhanced?.awake_time_minutes != null ? Math.round(Number(enhanced.awake_time_minutes)) : null;
  const latencyMins = enhanced?.sleep_latency_minutes != null ? Math.round(Number(enhanced.sleep_latency_minutes)) : null;
  const sleepScore = enhanced?.sleep_score ?? oura?.sleep_score ?? null;

  const lightMins = totalSleepMins && totalSleepMins > (deepMins ?? 0) + (remMins ?? 0)
    ? totalSleepMins - (deepMins ?? 0) - (remMins ?? 0)
    : 0;
  const totalBar = (totalSleepMins ?? 0) + (awakeMins ?? 0);

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Moon size={20} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-text-primary">Sen · ostatnia noc</h3>
        </div>
        <Link
          to="/oura"
          className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          <span>Więcej</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton variant="block" className="h-28" />
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-light ${(sleepScore ?? 0) >= 80 ? 'text-success' : (sleepScore ?? 0) >= 70 ? 'text-text-primary' : 'text-warning'}`}>
              {sleepScore ?? '—'}
            </span>
            <span className="text-sm text-text-secondary">
              {formatMinsToHours(totalSleepMins)} snu
              {totalBar > 0 && ` · efektywność ${Math.round(((totalSleepMins ?? 0) / totalBar) * 100)}%`}
            </span>
          </div>

          <OuraNightStageBar
            deepMins={deepMins}
            remMins={remMins}
            lightMins={lightMins}
            awakeMins={awakeMins}
            totalBar={totalBar}
            latencyMins={latencyMins}
          />
        </>
      )}
    </Card>
  );
}
