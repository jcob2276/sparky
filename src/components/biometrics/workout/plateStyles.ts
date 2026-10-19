/** IWF-ish plate colors via design tokens (no raw hex in JSX). */

export const getPlateColorClass = (plate: number): string => {
  switch (plate) {
    case 25:
      return 'bg-danger text-white border-danger/80';
    case 20:
      return 'bg-info text-white border-info/80';
    case 15:
      return 'bg-warning text-black border-warning/70';
    case 10:
      return 'bg-success text-on-accent border-success/80';
    case 5:
      return 'bg-surface-raised text-text-primary border-border-custom';
    case 2.5:
      return 'bg-surface-3 text-text-primary border-border-custom';
    case 1.25:
      return 'bg-surface-2 text-text-muted border-border-custom/80';
    default:
      return 'bg-surface-2 text-text-secondary border-border-custom';
  }
};

/** Vertical plate on the bar sleeve — height ≈ diameter, width ≈ thickness. */
export const getPlateHeightClass = (plate: number): string => {
  switch (plate) {
    case 25:
      return 'h-[4.75rem] w-3';
    case 20:
      return 'h-[4.25rem] w-3';
    case 15:
      return 'h-14 w-2.5';
    case 10:
      return 'h-12 w-2.5';
    case 5:
      return 'h-10 w-2';
    case 2.5:
      return 'h-8 w-1.5';
    case 1.25:
      return 'h-7 w-1';
    default:
      return 'h-10 w-2';
  }
};

/** Compact round chip for the “add plate” picker — plate-face, not preschool size. */
export const getPlateChipClass = (plate: number): string => {
  const size =
    plate >= 20 ? 'h-8 w-8 text-3xs' : plate >= 10 ? 'h-7 w-7 text-3xs' : 'h-7 w-7 text-3xs';
  return `${size} rounded-full border font-bold tabular-nums shadow-[inset_0_1px_0_rgb(255_255_255_/0.18)] ${getPlateColorClass(plate)}`;
};

/** Shared sleeve bay chrome (charcoal + seledynowy wash). */
export const SLEEVE_BAY_CLASS =
  'relative flex h-[5.5rem] items-center overflow-x-auto rounded-[var(--tren-radius-ctl,0.75rem)] border border-border-custom bg-background px-2.5 shadow-[inset_0_0_24px_rgb(0_0_0_/0.55)]';
