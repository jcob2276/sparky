import type { SavedLink } from '../../../lib/linksApi';
import { MAX_ACTIVE_PER_MONTH } from '../../../lib/learning/learningModel';
import { useUserId } from '../../../store/useStore';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import LearningAddModal from './LearningAddModal';
import { useLearningMonth } from './useLearningPlan';

interface LearningAddFromLinkProps {
  link: SavedLink;
  onClose: () => void;
}

/** Dodanie linku z Pocket do planu miesiąca: sam pobiera plan i pilnuje limitu pozycji. */
export default function LearningAddFromLink({ link, onClose }: LearningAddFromLinkProps) {
  const userId = useUserId();
  const month = useLearningMonth(userId);

  if (!userId || month.isLoading) return null;

  const activeCount = month.assignments.filter((a) => a.status === 'active').length;
  if (activeCount >= MAX_ACTIVE_PER_MONTH) {
    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-6" size="sm">
        <div className="space-y-4 text-center">
          <h2 className="text-base font-black text-text-primary">Plan na ten miesiąc jest pełny</h2>
          <p className="text-sm text-text-muted">
            Masz już {MAX_ACTIVE_PER_MONTH} pozycje. Odpuść jedną w zakładce Rozwój albo skończ którąś, żeby dodać nową.
          </p>
          <Button onClick={onClose} className="w-full" size="sm">Rozumiem</Button>
        </div>
      </Modal>
    );
  }

  return (
    <LearningAddModal
      userId={userId}
      monthStart={month.monthStart}
      today={month.today}
      nextPosition={activeCount}
      excludeLinkIds={month.assignments.flatMap((a) => (a.link_id ? [a.link_id] : []))}
      initialLink={link}
      onClose={onClose}
    />
  );
}
