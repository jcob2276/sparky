import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { realitySlideKeys } from './queryKeys';
import { normalizeDraft, type RealitySlide, type SlideDraft } from './realitySlide';

async function fetchActiveSlide(userId: string): Promise<RealitySlide | null> {
  const { data, error } = await supabase
    .from('reality_slides')
    .select('*')
    .eq('user_id', userId)
    .is('retired_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Zapis tworzy nową wersję slajdu; poprzednia zostaje w historii. */
async function saveSlide(draft: SlideDraft): Promise<RealitySlide> {
  const clean = normalizeDraft(draft);
  const { data, error } = await supabase.rpc('set_reality_slide', {
    p_title: clean.title,
    p_statement: clean.statement,
    p_process_steps: clean.steps,
  });
  if (error) throw new Error(error.message);
  return data;
}

export function useRealitySlide(userId: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: realitySlideKeys.active(userId),
    queryFn: () => fetchActiveSlide(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });
  const save = useMutation({
    mutationFn: saveSlide,
    onSuccess: slide => client.setQueryData(realitySlideKeys.active(userId), slide),
  });
  return { query, save };
}
