const REPLACEMENTS: Array<[RegExp, string]> = [
  [/Targets depend on cardiovascular risk; lab notes (.+?) for low\/moderate risk\.?/i, 'Cel zależy od ryzyka sercowo-naczyniowego; laboratorium podaje $1 przy niskim lub umiarkowanym ryzyku.'],
  [/\binsufficient\b/gi, 'niewystarczający'],
  [/\bsufficient\b/gi, 'wystarczający'],
  [/\bdeficiency\b/gi, 'niedobór'],
  [/\btoxicity\b/gi, 'toksyczny'],
  [/\bnon-fasting\b/gi, 'nie na czczo'],
  [/\bfasting\b/gi, 'na czczo'],
];

/** Teksty norm z laboratoriów bywają po angielsku: pokazujemy je po polsku. */
export function localizeRefText(text: string | null | undefined): string | null {
  if (!text) return null;
  return REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

/** Zakres liczbowy (np. 4.0-10.0) zostaje w czcionce o stałej szerokości, opis słowny nie. */
export function isNumericRefText(text: string): boolean {
  return /^[<>≤≥]?\s*[\d.,\s–-]+$/.test(text.trim());
}
