import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, HeartPulse, RefreshCw, Route, Mountain, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSession } from '../../store/useStore';
import { supabase, invokeEdge } from '../../lib/supabase';
import { unwrapList } from '../../lib/supabaseUtils';
import { TIMEOUTS } from '../../lib/constants';
import Spinner from '../ui/Spinner';
import { Pressable } from '../ui/ControlPrimitives';

interface StravaActivityItem {
  strava_id: number | null;
  name: string | null;
  sport_type: string | null;
  start_date: string | null;
  distance: number | null;
  moving_time: number | null;
  pace_sec_per_km: number | null;
  hr_avg: number | null;
  perceived_exertion: number | null;
  total_elevation_gain: number | null;
  has_pr: boolean | null;
  is_oura: boolean | null;
}

function fmtPace(secPerKm: number | null | undefined) {
  if (!secPerKm) return '--';
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function fmtTime(seconds: number | null | undefined) {
  if (!seconds) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function fmtDateWithWeekday(iso: string | null | undefined) {
  if (!iso) return '--';
  try {
    const d = parseISO(iso);
    const day = format(d, 'dd.MM');
    const weekdays = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
    return `${day} · ${weekdays[d.getDay()]}`;
  } catch {
    return '--';
  }
}

function getHrZone(hr: number) {
  if (hr < 135) return { label: 'Strefa 2 (Tlenowa)', color: 'text-success bg-success/10 border-success/20' };
  if (hr < 155) return { label: 'Strefa 3 (Aerobowa)', color: 'text-primary bg-primary/10 border-primary/20' };
  if (hr < 172) return { label: 'Strefa 4 (Próg)', color: 'text-warning bg-warning/10 border-warning/20' };
  return { label: 'Strefa 5 (Maks)', color: 'text-danger bg-danger/10 border-danger/20' };
}

function isRun(activity: StravaActivityItem) {
  const text = `${activity.sport_type || ''} ${activity.name || ''}`.toLowerCase();
  return text.includes('run') || text.includes('bieg');
}

function RunCard({ activity }: { activity: StravaActivityItem }) {
  const distance = activity.distance ? (Number(activity.distance) / 1000).toFixed(2) : '--';
  const hrAvg = activity.hr_avg ? Math.round(activity.hr_avg) : null;
  const hrZone = hrAvg ? getHrZone(hrAvg) : null;
  const elevation = activity.total_elevation_gain != null ? Math.round(activity.total_elevation_gain) : null;

  return (
    <div className="rounded-xl border border-border-custom bg-surface p-3.5 shadow-sm ui-interactive hover:border-border-custom/80 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-3xs font-mono font-bold text-text-muted uppercase tracking-wider">
              {fmtDateWithWeekday(activity.start_date)}
            </span>
            {activity.has_pr && (
              <span className="inline-flex items-center gap-1 text-3xs font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <Trophy size={10} /> PR
              </span>
            )}
          </div>
          <h3 className="mt-0.5 truncate text-xs font-black uppercase tracking-tight text-text-primary font-display">
            {activity.name || 'Trening biegowy'}
          </h3>
        </div>

        {/* Small Strava/Garmin indicator */}
        <span className="text-3xs font-mono font-bold text-text-muted/60 px-1.5 py-0.5 rounded bg-surface-2/40 border border-border-custom/40">
          Garmin
        </span>
      </div>

      {/* 4 Telemetry Metrics */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Dystans */}
        <div className="rounded-lg bg-surface-2/50 border border-border-custom/50 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-3xs text-text-muted uppercase">
            <Route size={10} className="text-warning" />
            <span>Dystans</span>
          </div>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">
            {distance} <span className="text-3xs font-bold text-text-muted">km</span>
          </p>
        </div>

        {/* Tempo */}
        <div className="rounded-lg bg-surface-2/50 border border-border-custom/50 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-3xs text-text-muted uppercase">
            <Activity size={10} className="text-primary" />
            <span>Tempo</span>
          </div>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">
            {fmtPace(activity.pace_sec_per_km)} <span className="text-3xs font-bold text-text-muted">/km</span>
          </p>
        </div>

        {/* Czas */}
        <div className="rounded-lg bg-surface-2/50 border border-border-custom/50 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-3xs text-text-muted uppercase">
            <Clock size={10} className="text-text-muted" />
            <span>Czas</span>
          </div>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">
            {fmtTime(activity.moving_time)}
          </p>
        </div>

        {/* Wznios */}
        <div className="rounded-lg bg-surface-2/50 border border-border-custom/50 p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-3xs text-text-muted uppercase">
            <Mountain size={10} className="text-text-muted" />
            <span>Wznios</span>
          </div>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">
            {elevation != null ? `+${elevation}m` : '--'}
          </p>
        </div>
      </div>

      {/* Physiological Footer */}
      {(hrAvg || activity.perceived_exertion) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-custom/40 text-3xs font-bold">
          {hrAvg && hrZone && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-danger font-mono font-black">
                <HeartPulse size={11} /> {hrAvg} bpm
              </span>
              <span className={`px-1.5 py-0.2 rounded border font-sans ${hrZone.color}`}>
                {hrZone.label}
              </span>
            </div>
          )}
          {activity.perceived_exertion && (
            <span className="text-text-muted">
              Wysiłek RPE <span className="text-text-primary font-black">{activity.perceived_exertion}/10</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function StravaWidget() {
  const session = useSession();
  const [activities, setActivities] = useState<StravaActivityItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const data = unwrapList(await supabase
        .from('strava_activities_clean')
        .select('strava_id,name,sport_type,start_date,distance,moving_time,pace_sec_per_km,hr_avg,perceived_exertion,total_elevation_gain,has_pr,is_oura')
        .eq('user_id', session.user.id)
        .eq('is_oura', false)
        .order('start_date', { ascending: false })
        .limit(20));

      setActivities(data.filter(isRun).slice(0, 3));
    } catch (e: unknown) {
      console.error('[StravaWidget] fetch error:', e);
      setError(e instanceof Error ? (e as Error).message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchActivities();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchActivities]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await invokeEdge('sync?service=strava', {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUTS.default),
      });
      setLoading(true);
      await fetchActivities();
    } catch (e: unknown) {
      console.error('[StravaWidget] sync error:', e);
      setError(e instanceof Error ? (e as Error).message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section id="kronika-bieganie" className="rounded-2xl border border-border-custom bg-surface/50 backdrop-blur-[var(--blur-md)] p-4 sm:p-5 shadow-sm space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-22em)] text-warning font-display">
              Bieganie & Telemetria
            </p>
          </div>
          <h2 className="mt-0.5 text-lg font-black uppercase tracking-tight text-text-primary font-display flex items-center gap-2">
            Ostatnie 3 biegi
            <span className="text-xs font-mono font-bold text-text-muted">· Garmin / Strava</span>
          </h2>
        </div>
        <Pressable
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-surface text-text-secondary ui-interactive hover:bg-surface-solid hover:text-text-primary active:scale-95 shadow-sm cursor-pointer"
          title="Synchronizuj z Garmin / Strava"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin text-warning' : ''} />
          <span className="text-3xs font-bold uppercase tracking-wider hidden sm:inline">
            {syncing ? 'Synchronizacja...' : 'Sync'}
          </span>
        </Pressable>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-bold text-danger">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center rounded-xl bg-surface border border-border-custom">
          <Spinner size="sm" className="!border-text-primary/10 !border-t-warning" />
        </div>
      ) : activities.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-surface border border-border-custom">
          <p className="text-xs font-black uppercase tracking-widest text-text-muted">Brak biegów w feedzie</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((activity) => (
            <RunCard key={activity.strava_id || activity.start_date} activity={activity} />
          ))}
        </div>
      )}
    </section>
  );
}
