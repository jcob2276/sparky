/**
 * @file exerciseImages.ts
 * @role Zdjęcia i sprzęt ćwiczeń z darmowej bazy free-exercise-db (domena publiczna), dopasowane do polskich nazw z dziennika.
 * Indeks (~80 KB) ładuje się leniwie, same zdjęcia przychodzą z CDN dopiero gdy karta ćwiczenia jest widoczna.
 */
import { useEffect, useState } from 'react';
import { normalize } from '../../data/exercises';

const IMAGE_CDN = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

type IndexRow = [id: string, name: string, equipment: string, image: string];

export interface ExerciseVisual {
  name: string;
  imageUrl: string;
  /** Sprzęt po polsku, np. „Sztanga”. */
  equipment: string | null;
  isBarbell: boolean;
}

/** Polskie nazwy z dziennika → angielska nazwa w bazie zdjęć. */
export const POLISH_TO_ENGLISH: Record<string, string> = {
  'wyciskanie płaskie': 'Barbell Bench Press - Medium Grip',
  'wyciskanie hantli na ławce': 'Dumbbell Bench Press',
  'wyciskanie skośne': 'Barbell Incline Bench Press - Medium Grip',
  dipy: 'Dips - Triceps Version',
  rozpiętki: 'Dumbbell Flyes',
  'martwy ciąg': 'Barbell Deadlift',
  'martwy ciąg rumuński': 'Romanian Deadlift',
  'podciąganie nachwytem': 'Pullups',
  'podciąganie podchwytem': 'Chin-Up',
  'lat pulldown': 'Wide-Grip Lat Pulldown',
  'wiosłowanie sztangą': 'Bent Over Barbell Row',
  'wiosłowanie jedną ręką': 'One-Arm Dumbbell Row',
  'odwrotne rozpiętki': 'Reverse Flyes',
  'ohp sztangą': 'Standing Military Press',
  'wznosy bokiem': 'Side Lateral Raise',
  'wznosy bokiem dropset': 'Side Lateral Raise',
  'leaning cable lateral raise': 'Cable Seated Lateral Raise',
  'uginanie z hantlami': 'Dumbbell Bicep Curl',
  'uginanie hantli (ławka skośna)': 'Incline Dumbbell Curl',
  'uginanie sztangi stojąc': 'Barbell Curl',
  'pushdown na lince': 'Triceps Pushdown',
  'overh. triceps ext. (linka)': 'Cable Rope Overhead Triceps Extension',
  'prostowanie łokci (wyciąg)': 'Triceps Pushdown - Rope Attachment',
  'przysiad ze sztangą': 'Barbell Full Squat',
  'wykroki (miejsce/bułgar)': 'Split Squat with Dumbbells',
  'leg curl': 'Lying Leg Curls',
  'hip thrust': 'Barbell Hip Thrust',
  'wspięcia na łydki': 'Standing Calf Raises',
  'box jump': 'Front Box Jump',
  'ab wheel rollout': 'Ab Roller',
  'face pull': 'Face Pull',
};

const EQUIPMENT_PL: Record<string, string> = {
  barbell: 'Sztanga',
  'olympic barbell': 'Sztanga olimpijska',
  'ez barbell': 'Łamana sztanga',
  'e-z curl bar': 'Łamana sztanga',
  'trap bar': 'Trap bar',
  dumbbell: 'Hantle',
  kettlebell: 'Kettlebell',
  kettlebells: 'Kettlebell',
  cable: 'Wyciąg',
  rope: 'Lina',
  machine: 'Maszyna',
  'leverage machine': 'Maszyna',
  'smith machine': 'Smith',
  'sled machine': 'Sanie',
  'elliptical machine': 'Orbitrek',
  'skierg machine': 'SkiErg',
  'stepmill machine': 'Stepper',
  'stationary bike': 'Rower',
  'body only': 'Masa ciała',
  'body weight': 'Masa ciała',
  weighted: 'Obciążenie',
  assisted: 'Wspomagane',
  band: 'Guma',
  bands: 'Gumy',
  'resistance band': 'Guma',
  'medicine ball': 'Piłka lekarska',
  'stability ball': 'Piłka',
  'bosu ball': 'BOSU',
  roller: 'Roller',
  'wheel roller': 'Ab wheel',
  hammer: 'Młot',
  tire: 'Opona',
  other: 'Inne',
};

/** Angielska nazwa sprzętu (OpenGym / free-exercise-db) → etykieta PL. */
export function formatEquipmentLabel(equipment: string | null | undefined): string | null {
  if (!equipment?.trim()) return null;
  const key = equipment.trim().toLowerCase();
  return EQUIPMENT_PL[key] ?? equipment.charAt(0).toUpperCase() + equipment.slice(1);
}

let indexPromise: Promise<IndexRow[]> | null = null;
let byName: Map<string, IndexRow> | null = null;

function loadIndex(): Promise<IndexRow[]> {
  indexPromise ??= import('../../data/exerciseImageIndex.json').then((mod) => {
    const rows = (mod.default ?? mod).flatMap((row): IndexRow[] => (row.length >= 4 ? [[row[0], row[1], row[2], row[3]]] : []));
    byName = new Map(rows.map((row) => [normalize(row[1]), row]));
    return rows;
  });
  return indexPromise;
}

function toVisual(row: IndexRow, nameOverride?: string): ExerciseVisual {
  const equipment = row[2];
  return {
    name: nameOverride ?? row[1],
    imageUrl: `${IMAGE_CDN}${row[3]}`,
    equipment: EQUIPMENT_PL[equipment] ?? null,
    isBarbell: equipment === 'barbell',
  };
}

/** Szuka zdjęcia po nazwie z dziennika (polskiej z listy albo angielskiej), a gdy się nie da — po słowach kluczowych. */
function findExerciseVisual(name: string): ExerciseVisual | null {
  if (!byName) return null;
  const key = normalize(name.trim());
  if (!key) return null;
  const mappedKey = Object.entries(POLISH_TO_ENGLISH).find(([pl]) => normalize(pl) === key)?.[1];
  const row = byName.get(normalize(mappedKey ?? name)) ?? null;
  if (row) return toVisual(row);
  if (key.length >= 5) {
    const partial = [...byName.entries()].find(([candidate]) => candidate === key || candidate.startsWith(key));
    if (partial) return toVisual(partial[1]);
  }
  return null;
}

/** Hook: zwraca zdjęcie i sprzęt ćwiczenia (lub null, gdy brak dopasowania). */
export function useExerciseVisual(name: string): ExerciseVisual | null {
  const [ready, setReady] = useState(byName !== null);
  useEffect(() => {
    if (byName) return;
    let active = true;
    void loadIndex().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return ready ? findExerciseVisual(name) : null;
}

export function polishNamesMissingFromIndex(rows: ReadonlyArray<ReadonlyArray<string>>): string[] {
  const known = new Set(rows.map((row) => normalize(row[1])));
  return Object.values(POLISH_TO_ENGLISH).filter((english) => !known.has(normalize(english)));
}
