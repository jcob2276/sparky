import type { DecisionCandidate } from '@vanguard/domain';
import { notify } from '../../../lib/notify';
import { useHealthspanProfile } from '../../../lib/healthspanApi';
import { useSynthesisDecisionMutation, useSynthesisQuery } from '../../../lib/synthesisApi';
import Skeleton from '../../ui/Skeleton';
import SynthesisCommandCenter from './SynthesisCommandCenter';

export default function SynthesisCommandCenterContainer({ userId }: { userId: string }) {
  const synthesis = useSynthesisQuery(userId);
  const healthspan = useHealthspanProfile(userId);
  const decision = useSynthesisDecisionMutation(userId);

  if (synthesis.isLoading) return <Skeleton className="h-80 rounded-2xl" />;
  if (!synthesis.data) return null;

  const handleDecision = (
    candidate: DecisionCandidate,
    action: 'accept' | 'dismiss' | 'complete' | 'snooze',
  ) => {
    decision.mutate(
      { candidate, decision: action },
      {
        onSuccess: () => notify('Decyzja zapisana.', 'success'),
        onError: () => notify('Nie udało się zapisać decyzji.', 'error'),
      },
    );
  };

  return (
    <SynthesisCommandCenter
      synthesis={synthesis.data}
      healthspan={healthspan.data ? {
        ageRange: {
          low: healthspan.data.profile.ageRange.low,
          high: healthspan.data.profile.ageRange.high,
        },
        pace: healthspan.data.pace.multiplier,
        recentScore: healthspan.data.summary.recentScore,
        baselineScore: healthspan.data.summary.baselineScore,
        coverage: healthspan.data.profile.confidence.coverage,
      } : undefined}
      onDecision={handleDecision}
    />
  );
}
