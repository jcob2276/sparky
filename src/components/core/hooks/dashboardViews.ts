import type { NavigateOptions, To } from 'react-router-dom';

export const TAB_ORDER = ['dzis', 'tydzien', 'historia'];

export type DashboardNavigate = (to: To | number, options?: NavigateOptions) => void;

export const normalizeView = (view: string | null | undefined) => {
  if (!view || view === 'workout' || view === 'mentor' || view === 'mirror' || view === 'body') return 'dzis';
  if (view === 'stream' || view === 'plan' || view === 'progress' || view === 'direction') return 'tydzien';
  if (view === 'stats' || view === 'photos') return 'historia';
  if (view === 'kariera') return 'projekty';
  if (view === 'badania') return 'dzis';
  return view;
};
