import { Shield, Zap, Wallet, type LucideIcon } from 'lucide-react';
import { bodyShort, incomeLabel, incomeShort, type LifeTargets } from '../lifeGoals';

/**
 * Single source of truth for the three life pillars (Ciało/Duch/Konto) and the
 * project-color → pillar mapping. Previously duplicated across 5 files with
 * inconsistent color-alias lists (see docs/FRONTEND_GUIDE.md) — always import
 * from here instead of redefining a local pillar map.
 */

export const PILLARS = ['cialo', 'duch', 'konto'] as const;
export type PillarId = typeof PILLARS[number];

export const PILLAR_META: Record<PillarId, {
  label: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  dot: string;
  color: string;
}> = {
  cialo: { label: 'Ciało', icon: Shield, text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500', color: 'emerald' },
  duch:  { label: 'Duch',  icon: Zap,    text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  dot: 'bg-indigo-500',  color: 'indigo' },
  konto: { label: 'Konto', icon: Wallet, text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-500',   color: 'amber'  },
};

/** Every project/dream color swatch that maps to a pillar (a pillar has several valid colors). */
export const COLOR_TO_PILLAR: Record<string, PillarId> = {
  emerald: 'cialo', green: 'cialo',
  indigo: 'duch', violet: 'duch', purple: 'duch', sky: 'duch',
  amber: 'konto', yellow: 'konto', orange: 'konto', rose: 'konto',
};

export interface NorthStarGoal {
  pillar: PillarId;
  title: string;
  affirmation: string;
  why: string;
  metric: string;
  /** Skrót celu pod kafelkiem sfery. */
  short: string;
}

/** Sfery z celami liczbowymi pochodzącymi z bazy (`useLifeTargets`), nie z wpisanych na sztywno stałych. */
export const buildNorthStarSpheres = (t: LifeTargets): Record<PillarId, NorthStarGoal> => ({
  konto: {
    pillar: 'konto',
    title: 'Konto',
    affirmation: `Ja Jakub zarabiam z łatwością i luzem ${t.incomeNetPln / 1000} tysięcy złotych netto miesięcznie`,
    why: 'Bo chcę mieć luz z kasą i kupować co tylko chcę',
    metric: incomeLabel(t),
    short: incomeShort(t),
  },
  duch: {
    pillar: 'duch',
    title: 'Duch',
    affirmation: 'Ja Jakub z łatwością buduję nowe relacje i mam ogromne powodzenie wśród kobiet',
    why: 'Bo chcę mieć kobitę i sex i dzieci',
    metric: 'Głębokie relacje i powodzenie',
    short: 'Relacje',
  },
  cialo: {
    pillar: 'cialo',
    title: 'Ciało',
    affirmation: `Ja Jakub buduję codziennie swoje ciało, ${t.bodyFatPct}% BF i ${t.benchKg} kg bench press`,
    why: 'Bo chcę wyglądać pociągająco',
    metric: `${t.bodyFatPct}% BF · ${t.benchKg} kg bench press`,
    short: bodyShort(t),
  },
});

