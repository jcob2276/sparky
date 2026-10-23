/** YYYY-MM-DD -> DD.MM.YYYY (bez parsowania przez Date, więc bez przesunięć stref). */
export function formatDotDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}.${m}.${y}` : iso;
}
