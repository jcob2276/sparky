/** Garmin zapisuje pobyt w saunie/spa jako aktywność „Kardio” — Kardio to zawsze sauna (bez progu czasu). */
export function isGarminSaunaActivity(a: { name?: string | null; sport_type?: string | null }): boolean {
  const sType = (a.sport_type || '').toLowerCase();
  const n = (a.name || '').toLowerCase();
  return (
    sType.includes('cardio') ||
    sType === 'sauna' ||
    n.includes('kardio') ||
    n.includes('cardio') ||
    n.includes('sauna')
  );
}
