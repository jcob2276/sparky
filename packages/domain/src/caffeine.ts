/** Estimate only named caffeine sources; arbitrary food names or nutrient doses are not evidence. */
export function estimateCaffeineMg(name: string): number {
  const n = name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');
  // Match whole Unicode words: "kawalki" is not "kawa", "steak" is not "tea".
  const words = new Set(n.match(/\p{L}+/gu) ?? []);
  const has = (...tokens: string[]) => tokens.some((token) => words.has(token));
  const explicit = n.match(/(\d{1,4})\s*mg\b/);
  if (explicit && has('kofeina', 'kofeiny', 'caffeine')) return Number(explicit[1]);
  if (/bezkofein|bez kofeiny|decaf|caffeine[ -]free|herbal tea|herbata ziolowa|rooibos/.test(n)) return 0;

  let mg = 0;
  if (has('espresso')) mg = 63;
  else if (has('kawa', 'kawy', 'kawe', 'coffee', 'americano', 'cappuccino', 'latte',
    'cortado', 'macchiato', 'starbucks') || /flat white|cold brew/.test(n)) mg = 95;
  else if (has('matcha') || /green tea/.test(n)) mg = 30;
  else if (has('herbata', 'herbaty', 'herbate', 'tea')) mg = 47;
  else if (has('monster') || /energy drink|red bull/.test(n)) mg = 80;
  else if (has('cola', 'pepsi')) mg = 35;
  return mg > 0 && explicit ? Number(explicit[1]) : mg;
}
