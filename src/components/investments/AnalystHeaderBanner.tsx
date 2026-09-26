import { FC } from 'react';
import Button from '../ui/Button';
import { Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  remaining: number;
  limit: number;
  hasMessages: boolean;
  onNewChat: () => void;
}

export const AnalystHeaderBanner: FC<Props> = ({
  remaining,
  limit,
  hasMessages,
  onNewChat,
}) => (
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
          Rozmawiasz z asystentem na danych ujawnień. Limit tego miesiąca: {remaining} z {limit} pytań.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
