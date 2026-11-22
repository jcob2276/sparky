const BORN = new Date('2002-07-06');

export function livedDays(): number {
  return Math.floor((Date.now() - BORN.getTime()) / 86400000);
}
