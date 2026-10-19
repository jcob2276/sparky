export const getPlateColorClass = (plate: number) => {
  switch (plate) {
    case 25:
      return 'bg-danger text-white border-danger/40';
    case 20:
      return 'bg-info text-white border-info/40';
    case 15:
      return 'bg-warning text-black border-warning/40';
    case 10:
      return 'bg-success text-white border-success/40';
    case 5:
      return 'bg-surface-3 text-text-primary border-border-custom';
    case 2.5:
      return 'bg-surface-2 text-text-primary border-border-custom';
    case 1.25:
      return 'bg-surface-3/60 text-text-muted border-border-custom/50';
    default:
      return 'bg-surface-2 text-text-secondary border-border-custom';
  }
};

export const getPlateHeightClass = (plate: number) => {
  switch (plate) {
    case 25:
      return 'h-24 w-5';
    case 20:
      return 'h-20 w-5';
    case 15:
      return 'h-16 w-4';
    case 10:
      return 'h-14 w-4';
    case 5:
      return 'h-12 w-4';
    case 2.5:
      return 'h-10 w-3.5';
    case 1.25:
      return 'h-8 w-3';
    default:
      return 'h-12 w-4';
  }
};
