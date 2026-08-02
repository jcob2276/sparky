import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMedicalRecordData } from '../../../lib/health/medicalRecordsApi';

export function useMedicalData(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['medical-data', userId],
    queryFn: async () => {
      if (!userId) return { labs: [], bodyComposition: [], documents: [] };
      return fetchMedicalRecordData(userId);
    },
    enabled: !!userId,
  });

  const labs = query.data?.labs ?? [];
  const bodyComposition = query.data?.bodyComposition ?? [];
  const documents = query.data?.documents ?? [];
  const loading = query.isLoading;
  const error = query.error instanceof Error ? query.error.message : null;

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return { labs, bodyComposition, documents, loading, error, refresh };
}

