import { Wallet, Zap, Shield } from 'lucide-react';
import type { PillarId } from '../../../lib/projects/pillars';
import kontoPhoto from '../../../assets/goals/konto.webp';
import duchPhoto from '../../../assets/goals/duch.webp';
import cialoPhoto from '../../../assets/goals/cialo.webp';

export const PILLAR_ORDER: PillarId[] = ['konto', 'duch', 'cialo'];

export const PILLAR_CONFIG = {
  konto: { icon: Wallet, borderColor: 'border-warning/30', bgActive: 'bg-warning/10', badgeText: 'text-warning', shortMetric: '15k zł / msc', photo: kontoPhoto },
  duch: { icon: Zap, borderColor: 'border-primary/30', bgActive: 'bg-primary/10', badgeText: 'text-primary', shortMetric: 'Relacje', photo: duchPhoto },
  cialo: { icon: Shield, borderColor: 'border-success/30', bgActive: 'bg-success/10', badgeText: 'text-success', shortMetric: '15% BF · 100 kg', photo: cialoPhoto },
};

const RACE_DATE_DEFAULT = '2026-10-04T00:00:00';
const RACE_NAME_DEFAULT = 'Maraton w Koszycach';
const PREP_START_DATE = '2026-06-15T00:00:00';

export function getMarathonStats() {
  const now = Date.now();
  const target = new Date(RACE_DATE_DEFAULT).getTime();
  const start = new Date(PREP_START_DATE).getTime();
  const daysLeft = Math.ceil((target - now) / 86400000);
  const totalPrepDays = Math.max(1, Math.ceil((target - start) / 86400000));
  const elapsedDays = Math.max(0, Math.ceil((now - start) / 86400000));
  const progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalPrepDays) * 100)));
  const weeksLeft = Math.floor(daysLeft / 7);
  const remainingDays = daysLeft % 7;
  return { daysLeft, progressPct, weeksLeft, remainingDays, name: RACE_NAME_DEFAULT };
}

export type MarathonStats = ReturnType<typeof getMarathonStats>;
