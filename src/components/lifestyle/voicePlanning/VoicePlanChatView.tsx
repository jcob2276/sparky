import { useEffect, useRef } from 'react';
import { Sparkles, User, Loader2 } from 'lucide-react';
import type { ConversationMessage } from '../../../lib/voicePlanningApi';

interface Props {
  messages: ConversationMessage[];
  interimTranscript: string;
  isAnalyzing: boolean;
  isRecording: boolean;
}

export default function VoicePlanChatView({
  messages,
  interimTranscript,
  isAnalyzing,
  isRecording,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isAnalyzing]);

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 max-h-[300px] min-h-[160px]">
      {messages.length === 0 && !isRecording && (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 rounded-2xl bg-surface-2/40 border border-border-custom/30">
          <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={20} />
          </div>
          <h4 className="text-xs font-bold text-text-primary">
            Dyktuj swoje plany na dziś
          </h4>
          <p className="text-2xs text-text-muted max-w-xs">
            Naciśnij mikrofon i powiedz, co chcesz dziś zrobić. Sparky dopyta o szczegóły i ułoży 5 priorytetów.
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={index}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`size-7 rounded-xl flex items-center justify-center shrink-0 text-2xs font-bold ${
                isUser
                  ? 'bg-surface-2 text-text-secondary border border-border-custom/40'
                  : 'bg-primary/20 text-primary border border-primary/30'
              }`}
            >
              {isUser ? <User size={13} /> : <Sparkles size={13} />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                isUser
                  ? 'bg-primary text-primary-foreground font-semibold rounded-tr-sm'
                  : 'bg-surface border border-border-custom/60 text-text-primary rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        );
      })}

      {/* Live speech preview while speaking */}
      {isRecording && interimTranscript && (
        <div className="flex items-start gap-2.5 flex-row-reverse animate-pulse">
          <div className="size-7 rounded-xl bg-danger/20 text-danger border border-danger/30 flex items-center justify-center shrink-0">
            <User size={13} />
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs bg-danger/10 border border-danger/30 text-text-primary italic">
            „{interimTranscript}…”
          </div>
        </div>
      )}

      {/* Thinking state */}
      {isAnalyzing && (
        <div className="flex items-start gap-2.5">
          <div className="size-7 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 animate-spin">
            <Loader2 size={13} />
          </div>
          <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs bg-surface border border-border-custom/50 text-text-muted flex items-center gap-2">
            <span>Sparky analizuje i układa priorytety…</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
