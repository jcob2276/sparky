import { Wallet, Zap, Shield } from 'lucide-react';
import type { PillarId } from '../../../lib/projects/pillars';
import kontoPhoto from '../../../assets/goals/konto.webp';
import duchPhoto from '../../../assets/goals/duch.webp';
import cialoPhoto from '../../../assets/goals/cialo.webp';

export const PILLAR_ORDER: PillarId[] = ['konto', 'duch', 'cialo'];

export const PILLAR_CONFIG = {
  konto: { icon: Wallet, borderColor: 'border-warning/30', bgActive: 'bg-warning/10', badgeText: 'text-warning', photo: kontoPhoto },
  duch: { icon: Zap, borderColor: 'border-primary/30', bgActive: 'bg-primary/10', badgeText: 'text-primary', photo: duchPhoto },
  cialo: { icon: Shield, borderColor: 'border-success/30', bgActive: 'bg-success/10', badgeText: 'text-success', photo: cialoPhoto },
};
