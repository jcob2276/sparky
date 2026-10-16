import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Database } from './database.types';

export type VisionBoardItemRow = Database['public']['Tables']['vision_board_items']['Row'];

export function useVisionItemsQuery(userId: string) {
  return useQuery({
    queryKey: ['visionItems', 'list', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('vision_board_items').select('*').eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
