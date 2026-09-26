import React, { FC, useState, useRef, useEffect } from 'react';
import { askInvestmentsAnalyst, ChatMessage } from '../../lib/investments/investmentsAiService';
import { AiAnalystPrompts } from './AiAnalystPrompts';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { notify } from '../../lib/notify';
import { analystQuota, consumeAnalystQuota } from '../../lib/investments/analystQuota';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';

import { AnalystMessageRenderer } from './AnalystMessageRenderer';

const AnalystThread: FC<{ messages: ChatMessage[]; loading: boolean; scrollRef: React.RefObject<HTMLDivElement | null> }> = ({
  messages,
  loading,
  scrollRef,
}) => (
  <div className="bg-surface border border-border-custom rounded-3xl p-4 sm:p-6 shadow-xs space-y-5 max-h-[700px] overflow-y-auto">
    {messages.map((message, index) => (
      <div key={index} className={`flex gap-3 text-sm leading-relaxed ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {message.role === 'assistant' && (
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
            <Bot size={16} />
          </div>
        )}
        <div
          className={`rounded-2xl text-xs sm:text-sm shadow-xs transition-all ${
            message.role === 'user'
              ? 'p-4 max-w-xl bg-primary text-text-on-primary font-medium whitespace-pre-wrap'
              : 'p-5 w-full max-w-4xl bg-surface border border-border-custom text-text-primary shadow-xs'
          }`}
        >
          {message.role === 'assistant' ? (
            <AnalystMessageRenderer content={message.content} />
          ) : (
            message.content
          )}
        </div>
        {message.role === 'user' && (
          <div className="w-8 h-8 rounded-xl bg-surface border border-border-custom text-text-secondary flex items-center justify-center shrink-0 mt-1 shadow-2xs">
            <User size={16} />
          </div>
        )}
      </div>
    ))}
    {loading && (
      <div className="flex gap-3 text-sm items-center text-text-muted">
        <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0 animate-pulse">
          <Bot size={16} />
        </div>
        <div className="text-xs font-mono animate-pulse">Analityk AI analizuje dane 13F i KNF...</div>
      </div>
    )}
    <div ref={scrollRef} />
  </div>
);

export const InvestmentsAnalystView: FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(() => analystQuota());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || loading) return;
    if (analystQuota().remaining <= 0) {
      notify('Limit 120 pytań w tym miesiącu jest wyczerpany.', 'error');
      setQuota(analystQuota());
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
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
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd komunikacji z modelem.';
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <Sparkles size={11} />
                <span>Analityk AI · OpenRouter</span>
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                Model: Gemini 2.5 Flash / Jev
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Analityk AI
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              Rozmawiasz z asystentem na danych ujawnień. Limit tego miesiąca: {quota.remaining} z {quota.limit} pytań.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw size={13} />}
                onClick={handleClear}
                className="rounded-xl text-xs font-semibold"
              >
                Nowa rozmowa
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Prompts if conversation is empty */}
      {messages.length === 0 && (
        <AiAnalystPrompts onSelectPrompt={(prompt) => handleSend(prompt)} />
      )}

      {/* Chat Messages */}
      {messages.length > 0 && (
        <AnalystThread messages={messages} loading={loading} scrollRef={scrollRef} />
      )}

      {/* Input Box */}
      <div className="p-4 rounded-3xl bg-surface border border-border-custom shadow-xs flex items-center gap-3">
        <div className="flex-1">
          <Input
            type="text"
            size="md"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Zadaj pytanie analitykowi: np. 'Kto kupował akcje NVDA?', 'Jakie szorty ma Dino?'..."
            disabled={loading}
          />
        </div>
        <Button
          size="md"
          variant="primary"
          icon={<Send size={15} />}
          onClick={() => handleSend()}
          disabled={loading || !inputVal.trim()}
          className="rounded-xl font-bold shrink-0"
        >
          Wyślij ↵
        </Button>
      </div>
    </div>
  );
};
