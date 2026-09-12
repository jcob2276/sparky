import { useQuery } from '@tanstack/react-query';
import { fetchMedicalRecordData } from './medicalRecordsApi';

const EMPTY_RECORD = { labs: [], bodyComposition: [], documents: [] };

/**
 * Domenowe hooki Kartoteki. To jest warstwa, przez którą inne obszary aplikacji
 * (desktop, synteza, dashboard) czytają dane medyczne — komponenty medyczne
 * korzystają z tych samych hooków, więc nie ma drugiej ścieżki pobierania.
 */
export function useMedicalRecordData(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['medical-data', userId],
    queryFn: async () => {
      if (!userId) return EMPTY_RECORD;
      return fetchMedicalRecordData(userId);
    },
    enabled: !!userId,
  });

  return {
    labs: query.data?.labs ?? [],
    bodyComposition: query.data?.bodyComposition ?? [],
    documents: query.data?.documents ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.refetch,
  };
}
