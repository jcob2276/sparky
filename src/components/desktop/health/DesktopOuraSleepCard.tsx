import { Moon, ArrowUpRight, Heart, Clock } from 'lucide-react';
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
        <span>Architektura nocy</span>
        {latencyMins != null && (
          <span className="flex items-center gap-1">
            <Clock size={10} /> Czas zasypiania: <strong className="text-text-secondary">{latencyMins} min</strong>
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
      <div className="flex items-center justify-between text-3xs text-text-muted pt-1">
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

  const totalSleepMins = enhanced?.total_sleep_hours != null
    ? Math.round(Number(enhanced.total_sleep_hours) * 60)
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

  const awakeMins = enhanced?.awake_time_minutes ?? null;
  const latencyMins = enhanced?.sleep_latency_minutes ?? null;
  const lowestHr = enhanced?.sleep_lowest_heart_rate ?? oura?.rhr_avg ?? null;
  const hrvAvg = enhanced?.sleep_average_hrv ?? oura?.hrv_avg ?? null;
  const sleepScore = enhanced?.sleep_score ?? oura?.sleep_score ?? null;

  const lightMins = totalSleepMins && totalSleepMins > (deepMins ?? 0) + (remMins ?? 0)
    ? totalSleepMins - (deepMins ?? 0) - (remMins ?? 0)
    : 0;
  const totalBar = (totalSleepMins ?? 0) + (awakeMins ?? 0);

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Moon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Oura Health & Architektura Snu</h3>
            <p className="text-xs text-text-muted">
              Fazy snu, latencja, spoczynkowe tętno i odnowa autonomicznego układu nerwowego
            </p>
          </div>
        </div>
        <Link
          to="/oura"
          className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          <span>Pełna analityka Oura</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="h-28 animate-pulse rounded-xl bg-border-custom/30" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Wynik snu</p>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className={`text-2xl font-light ${
                  (sleepScore ?? 0) >= 80 ? 'text-success' : (sleepScore ?? 0) >= 70 ? 'text-text-primary' : 'text-warning'
                }`}>
                  {sleepScore ?? '—'}
                </span>
                <span className="text-2xs text-text-muted">/ 100</span>
              </div>
              <p className="mt-0.5 text-2xs text-text-muted">{formatMinsToHours(totalSleepMins)} łącznie</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-primary">Sen głęboki (Deep)</p>
              <p className="mt-1 text-2xl font-light text-primary">
                {deepMins != null ? `${deepMins} min` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {deepMins != null && deepMins >= 75 ? 'optymalny (>1h 15m)' : 'cel: >75 min'}
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-info">Faza REM</p>
              <p className="mt-1 text-2xl font-light text-info">
                {remMins != null ? `${remMins} min` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {remMins != null && remMins >= 90 ? 'optymalny (>1h 30m)' : 'pamięć & kognicja'}
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
                <Heart size={11} className="text-error" /> Najniższe RHR / HRV
              </p>
              <p className="mt-1 text-2xl font-light text-text-primary">
                {lowestHr != null ? `${lowestHr} bpm` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {hrvAvg != null ? `HRV ${hrvAvg} ms` : 'autonomiczny układ nerwowy'}
              </p>
            </div>
          </div>

          <OuraNightStageBar
            deepMins={deepMins}
            remMins={remMins}
            lightMins={lightMins}
            awakeMins={awakeMins}
            totalBar={totalBar}
            latencyMins={latencyMins}
          />

          {/* Biologiczna synteza odnowy nocnej */}
          {totalSleepMins != null && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border-custom/50 bg-surface-2/30 px-3.5 py-2.5 text-2xs">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  (sleepScore ?? 0) >= 80 ? 'bg-success' : (sleepScore ?? 0) >= 70 ? 'bg-primary' : 'bg-warning'
                }`} />
                <span className="text-text-secondary leading-relaxed">
                  {totalSleepMins < 390 ? (
                    <>
                      Deficyt snu: <strong>-{Math.round((480 - totalSleepMins) / 60 * 10) / 10}h</strong> poniżej 8h. Udział Deep (<strong>{deepMins ?? 0}m</strong>) chroni układ nerwowy, ale skrócona faza REM (<strong>{remMins ?? 0}m</strong>) obniża konsolidację pamięci.
                    </>
                  ) : (
                    <>
                      Optymalna regeneracja: <strong>{formatMinsToHours(totalSleepMins)}</strong> snu, wysoka efektywność i zbalansowane fazy Deep/REM.
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-3xs font-medium text-text-muted">
                {totalBar > 0 && (
                  <span>
                    Efektywność: <strong className="text-text-primary">{Math.round(((totalSleepMins ?? 0) / totalBar) * 100)}%</strong>
                  </span>
                )}
                {latencyMins != null && (
                  <span>
                    Zasypianie: <strong className={latencyMins <= 20 ? 'text-success' : 'text-warning'}>
                      {latencyMins <= 20 ? 'w normie' : 'wydłużone'}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
