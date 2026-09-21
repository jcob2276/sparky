/**
 * @file workoutImporters.ts
 * @role Uniwersalny importer historii treningowej adaptowany z openGym:
 * - Parsowanie plików CSV ze Strong App
 * - Parsowanie plików CSV z FitNotes (Android / iOS)
 * - Klient Hevy Developer API (https://api.hevyapp.com)
 * Przekształca zewnętrzne dane do zunifikowanego formatu Sparky.
 */

export interface ImportedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  rir?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  notes?: string;
}

export interface ImportedExercise {
  name: string;
  muscleTags: string[];
  sets: ImportedSet[];
}

export interface ImportedWorkoutSession {
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  name: string;
  durationMinutes?: number;
  notes?: string;
  exercises: ImportedExercise[];
}

/**
 * Proste mapowanie nazw ćwiczeń na tagi mięśniowe Sparky.
 */
export function inferMuscleTags(exerciseName: string): string[] {
  const norm = exerciseName.toLowerCase();
  if (norm.includes('bench') || norm.includes('wyciskanie leżąc') || norm.includes('chest') || norm.includes('klat')) {
    return ['klatka', 'triceps'];
  }
  if (norm.includes('squat') || norm.includes('przysiad') || norm.includes('quad') || norm.includes('wykrok')) {
    return ['czworogłowe', 'pośladki'];
  }
  if (norm.includes('deadlift') || norm.includes('martwy') || norm.includes('rdl') || norm.includes('hamstring')) {
    return ['dwugłowe ud', 'pośladki', 'plecy'];
  }
  if (norm.includes('row') || norm.includes('wiosł') || norm.includes('pull') || norm.includes('drążk') || norm.includes('lat')) {
    return ['plecy', 'biceps'];
  }
  if (norm.includes('press') || norm.includes('ohp') || norm.includes('żołnierskie') || norm.includes('barki') || norm.includes('wznos')) {
    return ['barki', 'triceps'];
  }
  if (norm.includes('curl') || norm.includes('biceps') || norm.includes('uginanie')) {
    return ['biceps'];
  }
  if (norm.includes('triceps') || norm.includes('dips') || norm.includes('pompk')) {
    return ['triceps'];
  }
  if (norm.includes('calf') || norm.includes('łydk')) {
    return ['łydki'];
  }
  return ['inne'];
}

/**
 * Parsuje plik CSV wyeksportowany z aplikacji Strong.
 * Format Strong CSV:
 * Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE
 */
export function parseStrongCsv(csvContent: string): ImportedWorkoutSession[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(';').length > lines[0].split(',').length ? lines[0].split(';') : lines[0].split(',');
  const delim = lines[0].includes(';') ? ';' : ',';

  const colIdx = {
    date: header.findIndex((h) => /date/i.test(h.trim())),
    workoutName: header.findIndex((h) => /workout name/i.test(h.trim())),
    duration: header.findIndex((h) => /duration/i.test(h.trim())),
    exerciseName: header.findIndex((h) => /exercise name/i.test(h.trim())),
    setOrder: header.findIndex((h) => /set order/i.test(h.trim())),
    weight: header.findIndex((h) => /weight/i.test(h.trim())),
    reps: header.findIndex((h) => /reps/i.test(h.trim())),
    notes: header.findIndex((h) => /^notes/i.test(h.trim())),
    workoutNotes: header.findIndex((h) => /workout notes/i.test(h.trim())),
    rpe: header.findIndex((h) => /rpe/i.test(h.trim())),
  };

  const sessionsMap = new Map<string, ImportedWorkoutSession>();

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delim).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (rawCols.length < 5) continue;

    const rawDate = rawCols[colIdx.date] || '';
    const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
    const dateIso = dateMatch ? dateMatch[0] : rawDate.slice(0, 10);
    const workoutName = rawCols[colIdx.workoutName] || 'Trening (Strong)';
    const sessionKey = `${dateIso}_${workoutName}`;

    if (!sessionsMap.has(sessionKey)) {
      sessionsMap.set(sessionKey, {
        date: dateIso,
        name: workoutName,
        notes: rawCols[colIdx.workoutNotes] || undefined,
        exercises: [],
      });
    }

    const session = sessionsMap.get(sessionKey)!;
    const exName = rawCols[colIdx.exerciseName];
    if (!exName) continue;

    let exercise = session.exercises.find((e) => e.name === exName);
    if (!exercise) {
      exercise = {
        name: exName,
        muscleTags: inferMuscleTags(exName),
        sets: [],
      };
      session.exercises.push(exercise);
    }

    const weightKg = parseFloat(rawCols[colIdx.weight] || '0') || 0;
    const reps = parseInt(rawCols[colIdx.reps] || '0', 10) || 0;
    const setNumber = parseInt(rawCols[colIdx.setOrder] || '1', 10) || exercise.sets.length + 1;
    const rpe = colIdx.rpe >= 0 ? parseFloat(rawCols[colIdx.rpe]) || null : null;
    const rir = rpe ? Math.max(0, Math.round((10 - rpe) * 10) / 10) : null;

    exercise.sets.push({
      setNumber,
      weightKg,
      reps,
      rpe,
      rir,
      notes: rawCols[colIdx.notes] || undefined,
    });
  }

  return Array.from(sessionsMap.values());
}

/**
 * Parsuje plik CSV wyeksportowany z FitNotes.
 * Format FitNotes CSV:
 * Date, Exercise, Category, Weight (kgs), Reps, Distance, Time, Comment
 */
export function parseFitNotesCsv(csvContent: string): ImportedWorkoutSession[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delim = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(delim).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  const dateIdx = header.findIndex((h) => h.includes('date'));
  const exIdx = header.findIndex((h) => h.includes('exercise'));
  const weightIdx = header.findIndex((h) => h.includes('weight'));
  const repsIdx = header.findIndex((h) => h.includes('reps'));
  const commentIdx = header.findIndex((h) => h.includes('comment'));

  const sessionsMap = new Map<string, ImportedWorkoutSession>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 4) continue;

    const dateIso = cols[dateIdx]?.slice(0, 10) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) continue;

    const sessionKey = dateIso;
    if (!sessionsMap.has(sessionKey)) {
      sessionsMap.set(sessionKey, {
        date: dateIso,
        name: `Trening ${dateIso}`,
        exercises: [],
      });
    }

    const session = sessionsMap.get(sessionKey)!;
    const exName = cols[exIdx];
    if (!exName) continue;

    let exercise = session.exercises.find((e) => e.name === exName);
    if (!exercise) {
      exercise = {
        name: exName,
        muscleTags: inferMuscleTags(exName),
        sets: [],
      };
      session.exercises.push(exercise);
    }

    const weightKg = parseFloat(cols[weightIdx] || '0') || 0;
    const reps = parseInt(cols[repsIdx] || '0', 10) || 0;

    exercise.sets.push({
      setNumber: exercise.sets.length + 1,
      weightKg,
      reps,
      notes: cols[commentIdx] || undefined,
    });
  }

  return Array.from(sessionsMap.values());
}

interface HevySetRaw {
  weight_kg?: number | string | null;
  reps?: number | string | null;
  rpe?: number | string | null;
  set_type?: string | null;
}

interface HevyExerciseRaw {
  title?: string | null;
  sets?: HevySetRaw[] | null;
}

interface HevyWorkoutRaw {
  title?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  exercises?: HevyExerciseRaw[] | null;
}

/**
 * Klient Hevy Developer API (https://api.hevyapp.com).
 * Mapuje dane JSON z endpointu `/v1/workouts` na ujednolicone rekordy Sparky.
 */
export function mapHevyWorkoutsJson(hevyWorkouts: HevyWorkoutRaw[]): ImportedWorkoutSession[] {
  if (!Array.isArray(hevyWorkouts)) return [];

  return hevyWorkouts.map((hw) => {
    const dateIso = hw.start_time ? hw.start_time.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const durationMinutes = hw.end_time && hw.start_time
      ? Math.round((new Date(hw.end_time).getTime() - new Date(hw.start_time).getTime()) / 60000)
      : undefined;

    const exercises: ImportedExercise[] = (hw.exercises || []).map((he: HevyExerciseRaw) => {
      const exTitle = he.title || 'Ćwiczenie';
      const sets: ImportedSet[] = (he.sets || []).map((hs: HevySetRaw, idx: number) => {
        const weightKg = Number(hs.weight_kg) || 0;
        const reps = Number(hs.reps) || 0;
        const rpe = hs.rpe ? Number(hs.rpe) : null;
        const rir = rpe ? Math.max(0, Math.round((10 - rpe) * 10) / 10) : null;
        return {
          setNumber: idx + 1,
          weightKg,
          reps,
          rpe,
          rir,
          isWarmup: hs.set_type === 'warmup',
        };
      });

      return {
        name: exTitle,
        muscleTags: inferMuscleTags(exTitle),
        sets,
      };
    });

    return {
      date: dateIso,
      startTime: hw.start_time || undefined,
      endTime: hw.end_time || undefined,
      name: hw.title || 'Trening (Hevy)',
      durationMinutes,
      notes: hw.description || undefined,
      exercises,
    };
  });
}

import type { WorkoutExercise } from './workout';

/**
 * Konwertuje zaimportowaną sesję (Strong / Hevy / FitNotes) do formatu roboczego formularza WorkoutLogger.
 */
export function importedSessionToWorkoutExercises(session: ImportedWorkoutSession): WorkoutExercise[] {
  return session.exercises.map((ie) => ({
    id: Date.now() + Math.random(),
    name: ie.name,
    tags: ie.muscleTags || [],
    sets: ie.sets.map((is) => ({
      id: Date.now() + Math.random(),
      kg: is.weightKg ? String(is.weightKg) : '',
      reps: is.reps ? String(is.reps) : '',
      rir: is.rir != null ? String(is.rir) : '',
      msp: false,
      type: is.isWarmup ? 'warmup' : 'working',
    })),
  }));
}

