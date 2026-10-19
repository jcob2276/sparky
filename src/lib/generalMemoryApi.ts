import type { Tables } from './database.types';
import { supabase } from './supabase';
import { fetchOracleRecommendations } from './recommendationsApi';
import { parseMemorySourceRefs, type MemorySourceRef } from './memorySourcesApi';

export type GeneralViewPattern = Pick<Tables<'vanguard_behavioral_patterns'>,
  'pattern_type' | 'title' | 'evidence_text' | 'occurrence_count' | 'confidence' | 'status' | 'last_seen'>;
export interface GeneralViewCuriosity {
  hypothesis: string;
  provocation: string | null;
  confidence_score: number | null;
  category: string | null;
  evidence_count: number | null;
  created_at: string | null;
}
export interface GeneralViewWiki {
  id: string;
  title: string;
  page_type: string;
  status: string;
  confidence: number | null;
  summary: string | null;
  tags: string[] | null;
  last_seen_at: string | null;
  content_md: string | null;
  last_compiled_at: string | null;
  source_refs: MemorySourceRef[];
}

export async function fetchGeneralMemoryData(userId: string) {
  if (!userId) throw new Error('Brak użytkownika');
  const [patterns, wiki, curiosity, recommendations] = await Promise.all([
    supabase.from('vanguard_behavioral_patterns')
      .select('pattern_type, title, evidence_text, occurrence_count, confidence, status, last_seen')
      .eq('user_id', userId).in('status', ['active', 'candidate', 'visible', 'user_confirmed'])
      .order('occurrence_count', { ascending: false }).order('confidence', { ascending: false }).limit(20),
    supabase.from('vanguard_wiki_pages')
      .select('id, title, page_type, status, confidence, summary, tags, last_seen_at, content_md, source_refs, last_compiled_at')
      .eq('user_id', userId).in('status', ['active', 'needs_review', 'user_confirmed', 'hypothesis'])
      .order('confidence', { ascending: false }).order('last_seen_at', { ascending: false }).limit(30),
    supabase.from('vanguard_curiosity_queue')
      .select('hypothesis, provocation, confidence_score, category, evidence_count, created_at')
      .eq('user_id', userId).eq('status', 'pending').order('confidence_score', { ascending: false }).limit(20),
    fetchOracleRecommendations(userId),
  ]);
  for (const result of [patterns, wiki, curiosity]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    patterns: patterns.data || [],
    wiki: (wiki.data || []).map(page => ({ ...page, source_refs: parseMemorySourceRefs(page.source_refs) })),
    curiosity: curiosity.data || [],
    recommendations,
  };
}
