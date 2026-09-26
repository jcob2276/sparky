import { FC } from 'react';
import Button from '../ui/Button';
import { Sparkles, RefreshCw, History } from 'lucide-react';

interface Props {
  remaining: number;
  limit: number;
  hasMessages: boolean;
  onNewChat: () => void;
  conversationCount?: number;
  onOpenMobileHistory?: () => void;
}

export const AnalystHeaderBanner: FC<Props> = ({
  remaining,
  limit,
  hasMessages,
  onNewChat,
  conversationCount = 0,
  onOpenMobileHistory,
}) => (
  <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-border-custom shadow-xs">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-md text-3xs sm:text-2xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <Sparkles size={11} />
            <span>Analityk AI · OpenRouter</span>
          </span>
          <span className="text-3xs sm:text-2xs font-mono text-text-secondary">
            Model: Gemini 2.5 Flash · Live RAG
          </span>
        </div>
        <h2 className="text-lg sm:text-2xl font-extrabold text-text-primary tracking-tight">
          Analityk AI
        </h2>
        <p className="text-xs text-text-secondary mt-0.5 sm:mt-1 max-w-3xl leading-relaxed">
          Rozmawiasz z asystentem na danych ujawnień. Limit tego miesiąca: <span className="font-mono font-bold text-text-primary">{remaining} z {limit}</span> pytań.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
        {onOpenMobileHistory && (
          <Button
            size="sm"
            variant="secondary"
            icon={<History size={13} />}
            onClick={onOpenMobileHistory}
            className="lg:hidden rounded-xl text-xs font-semibold"
          >
            Historia {conversationCount > 0 ? `(${conversationCount})` : ''}
          </Button>
        )}

        {hasMessages && (
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={13} />}
            onClick={onNewChat}
            className="rounded-xl text-xs font-semibold"
          >
            Nowa rozmowa
          </Button>
        )}
      </div>
    </div>
  </div>
);
