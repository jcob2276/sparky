import { newSet, type WorkoutExercise } from './workoutUtils';

export interface WorkoutPreset {
  id: string;
  name: string;
  category: 'wertykalne' | 'horyzontalne' | 'mix' | 'plyo';
  categoryLabel: string;
  direction: 'vertical' | 'horizontal' | 'hybrid';
  recommendedWith: string;
  description: string;
  exercises: Array<{
    name: string;
    tags: string[];
    defaultSets: Array<{ kg: string; reps: string; rir?: string }>;
  }>;
}

export const WORKOUT_PRESETS: WorkoutPreset[] = [
  {
    id: 'vert-upper',
    name: 'Wertykalne: OHP + Podciąganie',
    category: 'wertykalne',
    categoryLabel: 'Wertykalne (Góra)',
    direction: 'vertical',
    recommendedWith: 'Świetnie łączy się z Horyzontalnym wyciskaniem leżąc i wiosłowaniem dla balansu obręczy barkowej.',
    description: 'Wyciskanie żołnierskie nad głowę i pionowe przyciąganie drążka. Buduje szerokie plecy i potężne barki.',
    exercises: [
      { name: 'Wyciskanie żołnierskie (OHP)', tags: ['barki', 'triceps'], defaultSets: [{ kg: '50', reps: '6' }, { kg: '50', reps: '6' }, { kg: '45', reps: '8' }] },
      { name: 'Podciąganie na drążku (nachwyt)', tags: ['plecy', 'biceps'], defaultSets: [{ kg: '0', reps: '8' }, { kg: '0', reps: '8' }, { kg: '0', reps: '6' }] },
      { name: 'Wznosy hantli bokiem', tags: ['barki'], defaultSets: [{ kg: '10', reps: '12' }, { kg: '10', reps: '12' }, { kg: '10', reps: '12' }] },
      { name: 'Ściąganie drążka wyciągu do klatki', tags: ['plecy'], defaultSets: [{ kg: '55', reps: '10' }, { kg: '55', reps: '10' }, { kg: '55', reps: '10' }] },
    ],
  },
  {
    id: 'horiz-upper',
    name: 'Horyzontalne: Bench Press + Wiosłowanie',
    category: 'horyzontalne',
    categoryLabel: 'Horyzontalne (Góra)',
    direction: 'horizontal',
    recommendedWith: 'Świetnie łączy się z ruchem wertykalnym (OHP, wznosy) oraz ćwiczeniami stabilizacji łopatki.',
    description: 'Płaskie wyciskanie klatki i poziome przyciąganie sztangi. Podstawa gęstości klatki i grubości pleców.',
    exercises: [
      { name: 'Wyciskanie sztangi leżąc (Bench Press)', tags: ['klatka', 'triceps'], defaultSets: [{ kg: '80', reps: '6' }, { kg: '80', reps: '6' }, { kg: '75', reps: '8' }] },
      { name: 'Wiosłowanie sztangą w opadzie', tags: ['plecy', 'tył barku'], defaultSets: [{ kg: '70', reps: '8' }, { kg: '70', reps: '8' }, { kg: '70', reps: '8' }] },
      { name: 'Wyciskanie hantli na skosie dodatnim', tags: ['klatka', 'barki'], defaultSets: [{ kg: '26', reps: '10' }, { kg: '26', reps: '10' }] },
      { name: 'Face Pulls (wyciąg)', tags: ['tył barku', 'rotatory'], defaultSets: [{ kg: '25', reps: '15' }, { kg: '25', reps: '15' }, { kg: '25', reps: '15' }] },
    ],
  },
  {
    id: 'vert-lower',
    name: 'Wertykalne: Przysiad + Eksplozja',
    category: 'wertykalne',
    categoryLabel: 'Wertykalne (Dół)',
    direction: 'vertical',
    recommendedWith: 'Łącz w mikrocyklu z Horyzontalnym biodrem (RDL / hip hinge) w osobnym dniu dla ochrony kolan.',
    description: 'Pionowa siła i napęd nóg. Maksymalizuje rekrutację czwórogłowych i skoczność pionową.',
    exercises: [
      { name: 'Przysiad ze sztangą (Back Squat)', tags: ['czwórogłowy', 'pośladki'], defaultSets: [{ kg: '90', reps: '6' }, { kg: '90', reps: '6' }, { kg: '90', reps: '6' }] },
      { name: 'Wykroki chodzone z hantlami', tags: ['czwórogłowy', 'pośladki'], defaultSets: [{ kg: '18', reps: '10' }, { kg: '18', reps: '10' }] },
      { name: 'Wypychanie nóg na suwnicy', tags: ['czwórogłowy'], defaultSets: [{ kg: '140', reps: '10' }, { kg: '140', reps: '10' }] },
      { name: 'Wspięcia na palce stojąc', tags: ['łydki'], defaultSets: [{ kg: '60', reps: '15' }, { kg: '60', reps: '15' }, { kg: '60', reps: '15' }] },
    ],
  },
  {
    id: 'horiz-lower',
    name: 'Horyzontalne: Martwy Ciąg + RDL',
    category: 'horyzontalne',
    categoryLabel: 'Horyzontalne (Dół / Hinge)',
    direction: 'horizontal',
    recommendedWith: 'Idealne dopełnienie dni wertykalnych; buduje żelazny tył ciała i przeciwdziała siedzącemu trybowi.',
    description: 'Dominacja biodra (hip hinge), dwugłowe ud, pośladki i prostowniki grzbietu.',
    exercises: [
      { name: 'Martwy ciąg klasyczny', tags: ['plecy', 'pośladki', 'dwugłowy'], defaultSets: [{ kg: '110', reps: '5' }, { kg: '110', reps: '5' }, { kg: '110', reps: '5' }] },
      { name: 'Rumuński martwy ciąg (RDL)', tags: ['dwugłowy', 'pośladki'], defaultSets: [{ kg: '80', reps: '8' }, { kg: '80', reps: '8' }, { kg: '80', reps: '8' }] },
      { name: 'Uginanie nóg leżąc na maszynie', tags: ['dwugłowy'], defaultSets: [{ kg: '40', reps: '12' }, { kg: '40', reps: '12' }] },
      { name: 'Allahy (brzuch z wyciągu)', tags: ['brzuch'], defaultSets: [{ kg: '35', reps: '15' }, { kg: '35', reps: '15' }] },
    ],
  },
  {
    id: 'plyo-power',
    name: 'Pliometria: Moc i Skoczność',
    category: 'plyo',
    categoryLabel: 'Pliometria (Opcjonalna)',
    direction: 'vertical',
    recommendedWith: 'Wykonuj ZAWSZE na początku sesji, przed ciężarami, gdy układ nerwowy jest świeży.',
    description: 'Skoczność reaktywna, sztywność ścięgna Achillesa i dynamika bez zmęczenia metabolicznego.',
    exercises: [
      { name: 'Pogo Jumps (sprężystość kostki)', tags: ['plyo', 'łydki'], defaultSets: [{ kg: '0', reps: '20' }, { kg: '0', reps: '20' }, { kg: '0', reps: '20' }] },
      { name: 'Depth Jumps (zeskok ze skrzyni + wyskok)', tags: ['plyo', 'czwórogłowy'], defaultSets: [{ kg: '0', reps: '5' }, { kg: '0', reps: '5' }, { kg: '0', reps: '5' }] },
      { name: 'Skok w dal z miejsca (Broad Jump)', tags: ['plyo', 'pośladki'], defaultSets: [{ kg: '0', reps: '4' }, { kg: '0', reps: '4' }] },
    ],
  },
];

export function presetToWorkoutExercises(preset: WorkoutPreset): WorkoutExercise[] {
  return preset.exercises.map((ex) => ({
    id: Date.now() + Math.random(),
    name: ex.name,
    tags: ex.tags,
    sets: ex.defaultSets.map((s) => ({
      ...newSet(),
      kg: s.kg,
      reps: s.reps,
      rir: s.rir || '',
    })),
  }));
}
