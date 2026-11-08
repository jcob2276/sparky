import { bodyShort, incomeLabel, incomeShort, type LifeTargets } from '../lifeGoals';

/**
 * Single source of truth for the three life pillars (Ciało/Duch/Konto) and the
 * project-color → pillar mapping. Previously duplicated across 5 files with
 * inconsistent color-alias lists (see docs/FRONTEND_GUIDE.md) — always import
 * from here instead of redefining a local pillar map.
 */

export type PillarId = 'cialo' | 'duch' | 'konto';

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

