import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptEnergyFix, dismissFinding, fetchFoodIntegrity, runFoodIntegrityAuditNow,
} from '../../../../lib/health/foodIntegrityApi';
import type { IntegrityFindingRow } from '../../../../lib/health/foodIntegrityView';
import { useUserId } from '../../../../store/useStore';

export function useFoodIntegrity() {
  const userId = useUserId();
  const client = useQueryClient();
  const key = ['food-integrity', userId ?? ''];
  const refresh = () => client.invalidateQueries({ queryKey: key });

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchFoodIntegrity(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const dismiss = useMutation({
    mutationFn: (finding: IntegrityFindingRow) => dismissFinding(userId!, finding.id),
    onSuccess: refresh,
  });
  const applyFix = useMutation({
    mutationFn: (finding: IntegrityFindingRow) => acceptEnergyFix(userId!, finding),
    onSuccess: () => {
      void refresh();
      void client.invalidateQueries({ queryKey: ['week-nutrition'] });
    },
  });
  const runNow = useMutation({ mutationFn: runFoodIntegrityAuditNow, onSuccess: refresh });

  return { query, dismiss, applyFix, runNow };
}
