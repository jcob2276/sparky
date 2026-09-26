import { FC, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalystChat } from '../../lib/investments/useAnalystChat';
import { AnalystHistorySidebar } from './AnalystHistorySidebar';
import { AnalystHeaderBanner } from './AnalystHeaderBanner';
import { AnalystThread } from './AnalystThread';
import { AnalystInputBar } from './AnalystInputBar';
import { AiAnalystPrompts } from './AiAnalystPrompts';
import { AnalystMobileHistoryDrawer } from './AnalystMobileHistoryDrawer';

interface Props {
  initialPrompt?: string;
}

export const InvestmentsAnalystView: FC<Props> = ({ initialPrompt }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryPrompt = searchParams.get('q') || initialPrompt;
  const lastExecutedPromptRef = useRef<string | null>(null);

  const {
    conversations,
    activeId,
    messages,
    inputVal,
    loading,
    isHistoryCollapsed,
    isMobileHistoryOpen,
    scrollRef,
    setInputVal,
    setIsHistoryCollapsed,
    setIsMobileHistoryOpen,
    handleSelectConversation,
    handleNewChat,
    handleDeleteConversation,
    handleSend,
  } = useAnalystChat();

  useEffect(() => {
    if (queryPrompt && queryPrompt.trim() && queryPrompt !== lastExecutedPromptRef.current) {
      lastExecutedPromptRef.current = queryPrompt;
      const textToExecute = queryPrompt.trim();
      if (searchParams.has('q')) {
        const next = new URLSearchParams(searchParams);
        next.delete('q');
        setSearchParams(next, { replace: true });
      }
      handleSend(textToExecute);
    }
  }, [queryPrompt, handleSend, searchParams, setSearchParams]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in text-text-primary">
      {/* 1. Header Banner */}
      <AnalystHeaderBanner
        hasMessages={messages.length > 0}
        onNewChat={handleNewChat}
        conversationCount={conversations.length}
        onOpenMobileHistory={() => setIsMobileHistoryOpen(true)}
      />

      {/* 2. Main Layout (Sidebar on desktop, Chat on mobile & desktop) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <AnalystHistorySidebar
            conversations={conversations}
            activeId={activeId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            isCollapsed={isHistoryCollapsed}
            onToggleCollapse={() => setIsHistoryCollapsed((prev) => !prev)}
          />
        </div>

        {/* Mobile History Drawer */}
        <AnalystMobileHistoryDrawer
          isOpen={isMobileHistoryOpen}
          onClose={() => setIsMobileHistoryOpen(false)}
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Chat Area */}
        <div className="flex-1 w-full min-w-0 space-y-4 sm:space-y-5">
          {messages.length === 0 ? (
            <>
              <AnalystInputBar
                inputVal={inputVal}
                loading={loading}
                onInputChange={setInputVal}
                onSend={() => handleSend()}
              />
              <AiAnalystPrompts onSelectPrompt={(prompt) => handleSend(prompt)} />
            </>
          ) : (
            <>
              <AnalystThread messages={messages} loading={loading} scrollRef={scrollRef} />
              <AnalystInputBar
                inputVal={inputVal}
                loading={loading}
                onInputChange={setInputVal}
                onSend={() => handleSend()}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
