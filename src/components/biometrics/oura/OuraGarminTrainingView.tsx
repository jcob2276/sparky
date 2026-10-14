import type { OuraHealthHubData } from './types';
import { activityHeartRateZones, activitySourceLabel } from '@vanguard/domain';
import { formatWarsawDate } from '../../../lib/date';
import DataStateNotice from '../../core/DataStateNotice';
function formatPace(movingSeconds: number, distanceMeters: number): string {
  if (!distanceMeters || distanceMeters <= 0) return '—';
  const totalKm = distanceMeters / 1000;
  const secPerKm = movingSeconds / totalKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s} /km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export function OuraGarminTrainingView({data}:{data:OuraHealthHubData}) {
  const activities = data.stravaActivities ?? [];
  const runs = activities.filter(activity=>/run/i.test(activity.sport_type ?? ''));
  const todayActivities = activities.filter(activity=>activity.start_date && formatWarsawDate(activity.start_date) === data.date);
  const zones = todayActivities.reduce<number[]>((sum,activity)=>{
    activityHeartRateZones(activity).forEach((seconds,index)=>{sum[index]=(sum[index] ?? 0)+seconds;}); return sum;
  },[]);
  const totalSeconds = zones.reduce((sum,seconds)=>sum+seconds,0);
  const cardio = data.strainRow?.date === data.date ? data.strainRow?.cardio_load : null;
  return <div className="space-y-4 pb-8">
    <div className="grid grid-cols-2 gap-3">
      <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
        <h2 className="text-xs font-bold">Sparky · obciążenie cardio</h2>
        <p className="text-2xl font-bold">{cardio ?? '—'}</p>
        <p className="text-xs text-text-secondary">{data.date ?? 'Brak daty'} · model obciążenia, nie pomiar regeneracji.</p>
      </section>
      <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
        <h2 className="text-xs font-bold">VO₂max z urządzenia</h2>
        <p className="text-2xl font-bold">{data.garminVo2Max ?? '—'}</p>
        <p className="text-xs text-text-secondary">{data.garminVo2Max == null ? 'Brak zapisanej estymacji z urządzenia.' : `${data.externalVo2Source ?? 'Garmin'} · estymacja, nie wynik laboratoryjny.`}</p>
      </section>
    </div>
    <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
      <h3 className="font-bold">Strefy tętna · {data.date ?? 'brak daty'}</h3>
      {!zones.length ? <DataStateNotice title="Brak danych stref tętna" detail="Źródło nie dostarczyło czasów w strefach dla tego dnia." /> : <>
        {zones.map((seconds,index)=><div key={index} className="space-y-1">
          <p className="text-xs">Z{index+1} · {(seconds/60).toFixed(1)} min</p>
          <div className="h-2 rounded-full bg-surface-raised"><div className="h-full rounded-full bg-info" style={{width:`${totalSeconds > 0 ? seconds/totalSeconds*100 : 0}%`}} /></div>
        </div>)}
        <p className="text-xs text-text-secondary">Strefy według konfiguracji źródła. Różne urządzenia mogą mieć różne progi.</p>
      </>}
    </section>
    <section className="space-y-3">
      <h3 className="font-bold">Ostatnie biegi · Garmin przez Intervals.icu</h3>
      {!runs.length && <DataStateNotice title="Brak zarejestrowanych biegów" detail="Sprawdź synchronizację Intervals.icu; brak wpisu nie oznacza opuszczenia treningu." />}
      {runs.map((activity,index)=><article key={activity.start_date ?? index} className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
        <h4 className="font-semibold">{activity.name ?? 'Bieg'}</h4>
        <p className="text-xs text-text-secondary">{activity.start_date ? formatWarsawDate(activity.start_date) : 'Brak daty'} · {activitySourceLabel(activity)}</p>
        <p className="text-sm">{activity.distance != null ? `${(activity.distance/1000).toFixed(1)} km` : 'Brak dystansu'} · {activity.moving_time != null ? formatDuration(activity.moving_time) : 'Brak czasu'}</p>
        <p className="text-xs text-text-secondary">Tempo: {activity.moving_time && activity.distance ? formatPace(activity.moving_time,activity.distance) : '—'} · HR: {activity.hr_avg ?? activity.average_heartrate ?? '—'} bpm</p>
      </article>)}
    </section>
  </div>;
}
