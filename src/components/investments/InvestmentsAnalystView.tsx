import React, { FC, useState, useRef, useEffect, useCallback } from 'react';
import { askInvestmentsAnalyst, ChatMessage } from '../../lib/investments/investmentsAiService';
import {
  AnalystConversation,
  loadAnalystConversations,
  createNewConversation,
  upsertConversation,
  removeConversation,
} from '../../lib/investments/analystHistoryService';
import { AnalystHistorySidebar } from './AnalystHistorySidebar';
import { AnalystHeaderBanner } from './AnalystHeaderBanner';
import { AnalystThread } from './AnalystThread';
import { AnalystInputBar } from './AnalystInputBar';
import { AiAnalystPrompts } from './AiAnalystPrompts';
import { notify, confirmDialog } from '../../lib/notify';
import { analystQuota, consumeAnalystQuota } from '../../lib/investments/analystQuota';

export const InvestmentsAnalystView: FC = () => {
  const [conversations, setConversations] = useState<AnalystConversation[]>(loadAnalystConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(() => analystQuota());
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectConversation = useCallback((conv: AnalystConversation) => {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setInputVal('');
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setInputVal('');
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmed = await confirmDialog('Czy na pewno chcesz usunąć tę rozmowę z historii?');
      if (!confirmed) return;
      const remaining = removeConversation(id);
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      notify('Rozmowa została usunięta z historii.', 'info');
    },
    [activeId]
  );

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || loading) return;
    if (analystQuota().remaining <= 0) {
      notify('Limit 120 pytań w tym miesiącu jest wyczerpany.', 'error');
      setQuota(analystQuota());
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    let currentConvId = activeId;
    let currentConv: AnalystConversation;

    if (!currentConvId) {
      currentConv = createNewConversation(text);
      currentConvId = currentConv.id;
      setActiveId(currentConvId);
    } else {
      const existing = conversations.find((c) => c.id === currentConvId);
      currentConv = existing ? { ...existing } : createNewConversation(text);
    }

    const nextMessages = [...messages, userMsg];
    currentConv.messages = nextMessages;
    setConversations(upsertConversation(currentConv));
    setMessages(nextMessages);
    setInputVal('');
    setLoading(true);

    try {
      const reply = await askInvestmentsAnalyst(nextMessages);
      if (!consumeAnalystQuota()) {
        notify('Limit 120 pytań w tym miesiącu jest wyczerpany.', 'error');
        setQuota(analystQuota());
        return;
      }
      setQuota(analystQuota());

      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      const finalMessages = [...nextMessages, assistantMsg];
      currentConv.messages = finalMessages;
      setConversations(upsertConversation(currentConv));
      setMessages(finalMessages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd komunikacji z modelem.';
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <AnalystHeaderBanner
        remaining={quota.remaining}
        limit={quota.limit}
        hasMessages={messages.length > 0}
        onNewChat={handleNewChat}
      />

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <AnalystHistorySidebar
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          isCollapsed={isHistoryCollapsed}
          onToggleCollapse={() => setIsHistoryCollapsed((prev) => !prev)}
        />

        <div className="flex-1 w-full min-w-0 space-y-5">
          {messages.length === 0 && (
            <AiAnalystPrompts onSelectPrompt={(prompt) => handleSend(prompt)} />
          )}

          {messages.length > 0 && (
            <AnalystThread messages={messages} loading={loading} scrollRef={scrollRef} />
          )}

          <AnalystInputBar
            inputVal={inputVal}
            loading={loading}
            onInputChange={setInputVal}
            onSend={() => handleSend()}
          />
        </div>
      </div>
    </div>
  );
};
