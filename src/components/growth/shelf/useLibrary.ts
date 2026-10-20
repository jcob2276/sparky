import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteLibraryItem, fetchLibrary, insertLibraryItems } from '../../../lib/learning/libraryApi';
import type { NewLibraryItem } from '../../../lib/learning/libraryImport';
import { learningKeys } from '../../../lib/queryKeys';

export function useLibraryItems(userId: string | null | undefined) {
  return useQuery({
    queryKey: learningKeys.library(userId ?? ''),
    queryFn: () => fetchLibrary(userId!),
    enabled: !!userId,
  });
}

export function useAddLibraryItems(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: NewLibraryItem[]) => insertLibraryItems(userId!, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learningKeys.library(userId ?? '') }),
  });
}

export function useDeleteLibraryItem(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLibraryItem(userId!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learningKeys.library(userId ?? '') }),
  });
}
