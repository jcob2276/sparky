import { supabase } from './supabase';
import { sortWikiSources, type WikiSource } from './wikiSources';

export async function fetchWikiSources(userId: string, pageId: string): Promise<WikiSource[]> {
  if (!userId || !pageId) throw new Error('Brak użytkownika lub identyfikatora strony');
  const { data, error } = await supabase.from('vanguard_wiki_sources')
    .select('id, source_table, source_id, source_date, quote, relevance')
    .eq('user_id', userId).eq('page_id', pageId)
    .order('relevance', { ascending: false })
    .order('source_date', { ascending: false, nullsFirst: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return sortWikiSources(data ?? []);
}
