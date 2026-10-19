import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMemorySource, type MemorySourceRef } from '../../../../lib/memorySourcesApi';

export function useMemorySource(userId: string, source: MemorySourceRef) {
  const [opened, setOpened] = useState(false);
  const query = useQuery({
    queryKey: ['memory-source', userId, source.table, source.id],
    queryFn: () => fetchMemorySource(userId, source),
    enabled: opened && !!userId,
    retry: false,
    gcTime: 0,
  });
  return { ...query, opened, open: () => setOpened(true) };
}
