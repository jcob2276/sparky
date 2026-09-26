import React, { FC } from 'react';
import { AnalystConversation } from '../../lib/investments/analystHistoryService';
import { AnalystHistorySidebar } from './AnalystHistorySidebar';
import Modal from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversations: AnalystConversation[];
  activeId: string | null;
  onSelectConversation: (conv: AnalystConversation) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
}

export const AnalystMobileHistoryDrawer: FC<Props> = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historia rozmów"
      size="md"
    >
      <div className="py-2">
        <AnalystHistorySidebar
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={(conv) => {
            onSelectConversation(conv);
            onClose();
          }}
          onNewChat={() => {
            onNewChat();
            onClose();
          }}
          onDeleteConversation={onDeleteConversation}
          isCollapsed={false}
          onToggleCollapse={onClose}
        />
      </div>
    </Modal>
  );
};
