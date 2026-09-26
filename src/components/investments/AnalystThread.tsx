import React, { FC } from 'react';
import { ChatMessage } from '../../lib/investments/investmentsAiService';
import { AnalystMessageRenderer } from './AnalystMessageRenderer';
import { JevSignalBadge } from './JevSignalBadge';
import { Bot, User } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const AnalystThread: FC<Props> = ({ messages, loading, scrollRef }) => (
  <div className="bg-surface border border-border-custom rounded-3xl p-4 sm:p-6 shadow-xs space-y-5 max-h-[700px] overflow-y-auto">
    {messages.map((message, index) => (
      <div
        key={index}
        className={`flex gap-3 text-sm leading-relaxed ${
          message.role === 'user' ? 'justify-end' : 'justify-start'
        }`}
      >
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
            <>
              {message.jevEvaluation && <JevSignalBadge evaluation={message.jevEvaluation} />}
              <AnalystMessageRenderer content={message.content} />
            </>
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
