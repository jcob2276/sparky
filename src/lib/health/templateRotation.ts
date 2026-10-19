/**
 * Rotacja schematów A/B/C w stylu openGym:
 * po ostatnio zrobionym dniu — następny w kolejności alfabetycznej PL.
 */

export type RotationTemplate = {
  workoutDay: string;
  date: string;
};

/** Nazwa dnia treningowego sugerowanego jako następny w rotacji (≥2 schematy). */
export function nextRotationDay(templates: RotationTemplate[]): string | null {
  if (templates.length < 2) return null;

  const withDate = templates.filter((t) => t.workoutDay.trim() && t.date);
  if (withDate.length < 2) return null;

  const last = [...withDate].sort((a, b) => b.date.localeCompare(a.date))[0];
  const order = [...new Set(withDate.map((t) => t.workoutDay.trim()))].sort((a, b) =>
    a.localeCompare(b, 'pl', { sensitivity: 'base' }),
  );
  if (order.length < 2) return null;

  const idx = order.findIndex((d) => d.toLowerCase() === last.workoutDay.trim().toLowerCase());
  if (idx < 0) return order[0];
  return order[(idx + 1) % order.length];
}

export function withNextRotationFlag<T extends RotationTemplate>(
  templates: T[],
): Array<T & { isNextInRotation: boolean }> {
  const next = nextRotationDay(templates);
  return templates.map((t) => ({
    ...t,
    isNextInRotation:
      next != null && t.workoutDay.trim().toLowerCase() === next.toLowerCase(),
  }));
}
