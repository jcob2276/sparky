import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import Button from '../../ui/Button';
import Skeleton from '../../ui/Skeleton';
import { TIMEOUTS } from '../../../lib/constants';
import { invokeEdge } from '../../../lib/supabase';

interface Props {
  date: string;
  /** Wstawia punkty do pola refleksji (użytkownik może je dalej edytować). */
  onInsert: (text: string) => void;
}

const minutes = (seconds: number): string => (seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`);

/** Podsumowanie dzisiejszych wiadomości i głosówek z Telegrama; znika, gdy ich nie było. */
export default function TelegramDaySummaryCard({ date, onInsert }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['telegram-day-summary', date],
    queryFn: () => invokeEdge('telegram-day-summary', { body: { date }, signal: AbortSignal.timeout(TIMEOUTS.llm) }),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (isLoading) return <Skeleton variant="text" lines={3} className="w-full" />;
  if (isError || !data?.bullets?.length) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-border-custom/50 bg-surface/40 p-3" aria-label="Podsumowanie z Telegrama">
      <div className="flex items-center gap-2">
        <MessageCircle size={14} className="text-primary" aria-hidden="true" />
        <span className="text-xs font-bold text-text-primary">Z Telegrama dziś</span>
        <span className="ml-auto text-2xs tabular-nums text-text-muted">
          {data.messageCount} {data.messageCount === 1 ? 'wiadomość' : 'wiadomości'}{data.voiceSeconds > 0 ? ` · głosówki ${minutes(data.voiceSeconds)}` : ''}
        </span>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-xs leading-snug text-text-secondary">
        {data.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
      </ul>
      <Button size="sm" variant="tonal" onClick={() => onInsert(data.bullets!.map((b) => `• ${b}`).join('\n'))}>Wstaw do opisu dnia</Button>
    </section>
  );
}
