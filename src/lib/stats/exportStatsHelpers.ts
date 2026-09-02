import { TIMEZONE } from '../../lib/date';
// Typed empty response matching Supabase PostgrestResponse shape
export function emptyRes<T>(): { data: T[]; error: null; count: null; status: number; statusText: string } {
  return { data: [], error: null, count: null, status: 200, statusText: 'OK' };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const getAvg = (arr: readonly (Record<string, unknown>)[] | null, key: string, decimalPlaces: number | null = null) => {
  const valid = (arr || []).filter(x => x[key] != null && Number(x[key]) > 0);
  if (valid.length === 0) return '--';
  const sum = valid.reduce((acc, x) => acc + Number(x[key]), 0);
  const avg = sum / valid.length;
  return decimalPlaces !== null ? avg.toFixed(decimalPlaces) : Math.round(avg);
};

export const toWarsawTime = (value: string | number | Date) =>
  new Date(value).toLocaleTimeString('pl-PL', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
