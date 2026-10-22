import { Smartphone } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { PhoneUsageRow } from '../../../lib/desktopDashboardTypes';

interface Props {
  phoneUsage?: PhoneUsageRow[];
}

/** Telefon wczoraj: łączny czas i ile z tego po 23:00. Bieganie i regeneracja mają swoje miejsca (Tydzień, Dziś). */
export default function DesktopPhoneTile({ phoneUsage = [] }: Props) {
  const latestPhone = phoneUsage[phoneUsage.length - 1] ?? null;
  const totalMinutes = latestPhone?.total_minutes ?? 0;
  const lateNight = latestPhone?.late_night_minutes ?? 0;
  const lateColor = lateNight > 40 ? 'text-danger' : lateNight > 15 ? 'text-warning' : 'text-success';

  if (totalMinutes <= 0) return null;
  return (
    <Card variant="surface" padding="1rem" className="space-y-1 border-border-custom bg-surface/30">
      <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
        <Smartphone size={13} className="text-info" /> Telefon · wczoraj
      </p>
      <p className="text-2xl font-black leading-none text-text-primary">{Math.floor(totalMinutes / 60)}h {String(totalMinutes % 60).padStart(2, '0')}m</p>
      <p className={`text-3xs leading-snug ${lateColor}`}>
        {lateNight > 0 ? `${lateNight} min po 23:00` : 'Nic po 23:00'}
      </p>
    </Card>
  );
}
