import { supabase } from '../supabase';
import type { BaselineResult } from './baselineTests';
import { parseSets, type SetRow } from './baselineRamp';

const BUCKET = 'baseline-videos';
const BASELINE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export async function fetchBaselineResults(userId: string): Promise<BaselineResult[]> {
  const { data, error } = await supabase.from('training_baseline_results')
    .select('test_key,sets,main_set,max_value,skipped,video_path,video_url').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, sets: parseSets(row.sets) }));
}

export interface BaselinePatch {
  sets?: SetRow[] | null;
  main_set?: string | null;
  max_value?: string | null;
  skipped?: boolean;
  video_url?: string | null;
  video_path?: string | null;
}

/** Zapisuje tylko podane pola testu; reszta wiersza zostaje. */
export async function saveBaselineResult(userId: string, testKey: string, patch: BaselinePatch): Promise<void> {
  const { error } = await supabase.from('training_baseline_results')
    .upsert({ user_id: userId, test_key: testKey, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id,test_key' });
  if (error) throw error;
}

const extension = (file: File): string => {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,4}$/.test(fromName)) return fromName;
  return file.type === 'video/quicktime' ? 'mov' : 'mp4';
};

/** Wgrywa nagranie testu (do 50 MB) i podmienia poprzednie. Zwraca ścieżkę w magazynie. */
export async function uploadBaselineVideo(userId: string, testKey: string, file: File, previousPath?: string | null): Promise<string> {
  if (!file.type.startsWith('video/')) throw new Error('Wybierz plik wideo.');
  if (file.size > BASELINE_VIDEO_MAX_BYTES) {
    throw new Error(`Nagranie ma ${Math.round(file.size / 1048576)} MB, a limit to 50 MB. Skróć je albo wklej link.`);
  }
  const path = `${userId}/${testKey}-${Date.now()}.${extension(file)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  try {
    await saveBaselineResult(userId, testKey, { video_path: path });
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
  return path;
}

export async function removeBaselineVideo(userId: string, testKey: string, path: string): Promise<void> {
  await saveBaselineResult(userId, testKey, { video_path: null });
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function baselineVideoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error('Nie udało się wczytać wideo.');
  return data.signedUrl;
}
