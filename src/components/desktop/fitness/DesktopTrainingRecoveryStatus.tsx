import { Activity, Smartphone } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { StravaActivitySummary } from '../desktopUtils';
import { daysBefore } from '../desktopUtils';
import type { PhoneUsageRow } from '../../../lib/desktopDashboardTypes';

interface Props {
  strava?: StravaActivitySummary[];
  phoneUsage?: PhoneUsageRow[];
}

function runLoadLabel(km7d: number, km28d: number): string {
  if (km7d === 0) return 'Bez biegania w tym tygodniu';
  const weeklyAvg = km28d / 4;
  if (weeklyAvg <= 0) return 'Pierwszy tydzień z biegiem';
  const ratio = km7d / weeklyAvg;
  if (ratio > 1.4) return 'Więcej niż zwykle — uważaj na stawy';
  if (ratio >= 0.8) return 'W swoim rytmie';
  return 'Mniej niż zwykle — lżejszy tydzień';
}

/** Dwa kafelki obok werdyktu dnia: bieganie i ekran w nocy. Regeneracja, HRV i tętno są w karcie „Stan dnia”. */
export default function DesktopTrainingRecoveryStatus({ strava = [], phoneUsage = [] }: Props) {
  const runs = strava.filter((s) => (s.sport_type || '').toLowerCase().includes('run'));
  const kmSince = (since: string) =>
    runs.filter((s) => s.start_date.slice(0, 10) >= since).reduce((sum, s) => sum + (Number(s.distance) || 0) / 1000, 0);
  const km7d = kmSince(daysBefore(7));
  const km28d = kmSince(daysBefore(28));

  const latestPhone = phoneUsage[phoneUsage.length - 1] ?? null;
  const totalMinutes = latestPhone?.total_minutes ?? 0;
  const lateNight = latestPhone?.late_night_minutes ?? 0;
  const lateColor = lateNight > 40 ? 'text-danger' : lateNight > 15 ? 'text-warning' : 'text-success';

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card variant="surface" padding="1rem" className="space-y-1 border-border-custom bg-surface/30">
        <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
          <Activity size={13} className="text-primary" /> Bieganie · 7 dni
        </p>
        <p className="text-2xl font-black leading-none text-text-primary">{km7d.toFixed(1)} km</p>
        <p className="text-3xs leading-snug text-text-muted">{runLoadLabel(km7d, km28d)}</p>
      </Card>
      {totalMinutes > 0 && (
        <Card variant="surface" padding="1rem" className="space-y-1 border-border-custom bg-surface/30">
          <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <Smartphone size={13} className="text-info" /> Telefon · wczoraj
          </p>
          <p className="text-2xl font-black leading-none text-text-primary">{Math.floor(totalMinutes / 60)}h {String(totalMinutes % 60).padStart(2, '0')}m</p>
          <p className={`text-3xs leading-snug ${lateColor}`}>
            {lateNight > 0 ? `${lateNight} min po 23:00` : 'Nic po 23:00'}
          </p>
        </Card>
      )}
    </div>
  );
}
