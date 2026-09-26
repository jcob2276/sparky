import { useState, useRef, useEffect, useCallback } from 'react';
import { askInvestmentsAnalyst, ChatMessage } from './investmentsAiService';
import {
  AnalystConversation,
  loadAnalystConversations,
  createNewConversation,
  upsertConversation,
  removeConversation,
} from './analystHistoryService';
import { notify, confirmDialog } from '../notify';

export function useAnalystChat() {
  const [conversations, setConversations] = useState<AnalystConversation[]>(loadAnalystConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectConversation = useCallback((conv: AnalystConversation) => {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setInputVal('');
    setIsMobileHistoryOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setInputVal('');
    setIsMobileHistoryOpen(false);
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
      const { content: reply, jevEvaluation } = await askInvestmentsAnalyst(nextMessages);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        jevEvaluation,
      };
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

  return {
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
  };
}
