import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCoreMemoryHistory, restoreCoreMemoryRevision, type MemoryRevision, type MemoryValueSide } from '../../lib/coreMemoryHistoryApi';

export function useCoreMemoryHistory(userId: string) {
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(30);
  const client = useQueryClient();
  const key = ['core-memory-history', userId];
  const query = useQuery({
    queryKey: [...key, limit], queryFn: () => fetchCoreMemoryHistory(userId, limit),
    enabled: expanded && !!userId, refetchOnWindowFocus: true, staleTime: 15_000,
  });
  const restore = useMutation({
    mutationFn: async ({ revision, valueSide }: { revision: MemoryRevision; valueSide: MemoryValueSide }) => {
      const current = query.data?.current.find(item => item.id === revision.preference_id);
      if (!current) throw new Error('Wpis już nie istnieje. Odśwież historię.');
      await restoreCoreMemoryRevision(revision.id, current.updated_at, valueSide);
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: key }); },
  });
  return {
    expanded, onExpand: setExpanded,
    current: query.data?.current ?? [], revisions: query.data?.revisions ?? [],
    loading: query.isFetching, error: query.error || restore.error,
    hasMore: (query.data?.total ?? 0) > (query.data?.revisions.length ?? 0),
    onLoadMore: () => setLimit(value => value + 30), onRefresh: () => { restore.reset(); void query.refetch(); },
    restoring: restore.isPending, restored: restore.isSuccess,
    onRestore: (revision: MemoryRevision, valueSide: MemoryValueSide = 'new') => { restore.mutate({ revision, valueSide }); },
  };
}
