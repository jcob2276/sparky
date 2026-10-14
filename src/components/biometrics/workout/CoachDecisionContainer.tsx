import { useNavigate } from 'react-router-dom';
import { useCoachDecision } from './useCoachDecision';
import CoachDecisionCard from './CoachDecisionCard';
import Spinner from '../../ui/Spinner';
export default function CoachDecisionContainer({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const state = useCoachDecision(userId, () => navigate('/trening'));
  if (state.loading) return <Spinner size="md" />;
  return <CoachDecisionCard {...state} openTraining={() => navigate('/trening')} />;
}
