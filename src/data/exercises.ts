export function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l')
    .replace(/ń/g,'n').replace(/ó/g,'o').replace(/ś/g,'s').replace(/ź/g,'z').replace(/ż/g,'z');
}

export { rirEffectiveness } from '@vanguard/domain';

/**
 * Autocomplete — tylko ćwiczenia z logu (kanoniczne nazwy).
 * Wolny tekst nadal działa; tagi z tagsForExercise / exerciseStimulus.
 */
export const EXERCISES = [
  // Klatka
  { name: 'Wyciskanie płaskie', tags: ['klatka', 'triceps', 'barki'] },
  { name: 'Wyciskanie hantli na ławce', tags: ['klatka', 'triceps', 'barki'] },
  { name: 'Wyciskanie skośne', tags: ['klatka', 'barki'] },
  { name: 'Dipy', tags: ['triceps', 'klatka'] },
  { name: 'Rozpiętki', tags: ['klatka'] },
  // Plecy
  { name: 'Martwy ciąg', tags: ['dwugłowe ud', 'pośladki', 'plecy'] },
  { name: 'Martwy ciąg rumuński', tags: ['dwugłowe ud', 'pośladki', 'plecy'] },
  { name: 'Podciąganie nachwytem', tags: ['plecy', 'biceps'] },
  { name: 'Podciąganie podchwytem', tags: ['biceps', 'plecy'] },
  { name: 'Lat Pulldown', tags: ['plecy', 'biceps'] },
  { name: 'Wiosłowanie sztangą', tags: ['plecy', 'biceps'] },
  { name: 'Wiosłowanie jedną ręką', tags: ['plecy', 'biceps'] },
  { name: 'Odwrotne rozpiętki', tags: ['barki'] },
  // Barki
  { name: 'OHP sztangą', tags: ['barki', 'triceps'] },
  { name: 'Wznosy bokiem dropset', tags: ['barki'] },
  { name: 'Leaning cable lateral raise', tags: ['barki'] },
  // Biceps
  { name: 'Uginanie z hantlami', tags: ['biceps'] },
  { name: 'Uginanie hantli (ławka skośna)', tags: ['biceps'] },
  { name: 'Uginanie sztangi stojąc', tags: ['biceps'] },
  // Triceps
  { name: 'Pushdown na lince', tags: ['triceps'] },
  { name: 'Overh. triceps ext. (linka)', tags: ['triceps'] },
  { name: 'Prostowanie łokci (wyciąg)', tags: ['triceps'] },
  // Nogi
  { name: 'Przysiad ze sztangą', tags: ['czworogłowe', 'pośladki', 'dwugłowe ud'] },
  { name: 'Wykroki (miejsce/bułgar)', tags: ['czworogłowe', 'pośladki'] },
  { name: 'Leg Curl', tags: ['dwugłowe ud'] },
  { name: 'Hip thrust', tags: ['pośladki', 'dwugłowe ud'] },
  { name: 'Wspięcia na łydki', tags: ['łydki'] },
  // Plyo (z logu)
  { name: 'Box jump', tags: ['plyo', 'czworogłowe', 'pośladki'] },
  { name: 'Box step-off', tags: ['plyo', 'czworogłowe', 'łydki'] },
  { name: 'Single-leg hop', tags: ['plyo', 'łydki', 'pośladki'] },
  { name: 'Split squat jump', tags: ['plyo', 'czworogłowe', 'pośladki'] },
  { name: 'Pogo hop', tags: ['plyo', 'łydki'] },
  // Brzuch
  { name: 'Ab wheel rollout', tags: ['brzuch'] },
  // Wellness
  { name: 'Sauna', tags: ['wellness'] },
];

// Exercise name → tags lookup (normalized keys)
const EXERCISE_MAP = new Map(
  EXERCISES.map(e => [normalize(e.name), e.tags])
);

export const MUSCLE_TAGS = [
  'klatka',
  'plecy',
  'barki',
  'biceps',
  'triceps',
  'brzuch',
  'czworogłowe',
  'dwugłowe ud',
  'pośladki',
  'łydki',
  'przedramiona',
];

export * from './exerciseStimulus'

/**
 * Effective-reps decay: a set far from failure (high RIR) stimulates muscle
 * less than one taken close to failure, even at identical kg×reps. No RIR
 * logged → assume the set counted (don't punish missing data).
 */
// rirEffectiveness re-exported above from @vanguard/domain

const TAG_COLOR: Record<string, string> = {
  klatka:        'bg-blue-500/15 text-blue-300 border-blue-500/25',
  plecy:         'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  barki:         'bg-violet-500/15 text-violet-300 border-violet-500/25',
  biceps:        'bg-orange-500/15 text-orange-300 border-orange-500/25',
  triceps:       'bg-rose-500/15 text-rose-300 border-rose-500/25',
  czworogłowe:   'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  'dwugłowe ud': 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  pośladki:      'bg-pink-500/15 text-pink-300 border-pink-500/25',
  nogi:          'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  brzuch:        'bg-teal-500/15 text-teal-300 border-teal-500/25',
  łydki:         'bg-slate-400/15 text-slate-300 border-slate-400/25',
  przedramiona:  'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  cardio:        'bg-red-500/15 text-red-300 border-red-500/25',
  wellness:      'bg-teal-400/15 text-teal-300 border-teal-400/25',
  plyo:          'bg-lime-500/15 text-lime-300 border-lime-500/25',
};

export function tagClass(tag: string): string {
  return TAG_COLOR[tag] ?? 'bg-white/10 text-white/50 border-white/15';
}

// Find tags for a given exercise name (fuzzy, normalized)
export function tagsForExercise(name: string): string[] {
  const key = normalize(name.trim());
  if (EXERCISE_MAP.has(key)) return EXERCISE_MAP.get(key) || [];
  // Partial match fallback
  for (const [k, tags] of EXERCISE_MAP) {
    if (k.includes(key) || key.includes(k)) return tags;
  }
  return [];
}
