import { EditThemeModal } from './modals/EditThemeModal';
import { AddLibraryItemModal } from './modals/AddLibraryItemModal';
import { AddPracticeEvidenceModal } from './modals/AddPracticeEvidenceModal';
import type {
  LibraryItem,
  PracticeEvidence,
  SparkyIdentityData,
} from '../../lib/growth/growth.types';

interface Props {
  userId: string;
  identity: SparkyIdentityData | null;
  libraryItems: LibraryItem[];
  practiceEvidences: PracticeEvidence[];
  activeModal: 'theme' | 'library' | 'evidence' | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function GrowthModals({
  userId,
  identity,
  libraryItems,
  practiceEvidences,
  activeModal,
  onClose,
  onRefresh,
}: Props) {
  return (
    <>
      <EditThemeModal
        userId={userId}
        identity={identity}
        isOpen={activeModal === 'theme'}
        onClose={onClose}
        onSaved={onRefresh}
      />
      <AddLibraryItemModal
        userId={userId}
        libraryItems={libraryItems}
        isOpen={activeModal === 'library'}
        onClose={onClose}
        onSaved={onRefresh}
      />
      <AddPracticeEvidenceModal
        userId={userId}
        practiceEvidences={practiceEvidences}
        isOpen={activeModal === 'evidence'}
        onClose={onClose}
        onSaved={onRefresh}
      />
    </>
  );
}
