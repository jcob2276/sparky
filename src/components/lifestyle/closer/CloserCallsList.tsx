import { useQuery } from '@tanstack/react-query';
import { ThumbsUp, TriangleAlert } from 'lucide-react';
import { callMoments, fetchCloserCallsForDay, type CallMoment } from '../../../lib/closer/closerCallsApi';
import { closerKeys } from '../../../lib/queryKeys';

interface Props {
  userId: string;
  date: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  closed: 'Sprzedane',
  follow_up: 'Do follow-upu',
  lost: 'Stracone',
  unclear: 'Niejasne',
};

function Moments({ title, items, tone }: { title: string; items: CallMoment[]; tone: 'good' | 'bad' }) {
  if (!items.length) return null;
  const Icon = tone === 'good' ? ThumbsUp : TriangleAlert;
  return (
    <div className="space-y-1">
      <p className={`flex items-center gap-1 text-2xs font-bold ${tone === 'good' ? 'text-success' : 'text-warning'}`}>
        <Icon size={11} /> {title}
      </p>
      <ul className="space-y-1">
        {items.map((m, i) => (
          <li key={`${m.timestamp}-${i}`} className="text-xs text-text-primary">
            <span className="text-text-muted">{m.timestamp} </span>
            {m.what}
            {m.why && <span className="block text-2xs text-text-muted">{m.why}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CloserCallsList({ userId, date }: Props) {
  const callsQuery = useQuery({
    queryKey: closerKeys.calls(userId, date),
    queryFn: () => fetchCloserCallsForDay(userId, date),
    enabled: !!userId && !!date,
  });
  const calls = callsQuery.data ?? [];
  if (!calls.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-2xs font-semibold text-text-muted">Nagrane rozmowy (Fathom)</p>
      {calls.map((call) => (
        <div key={call.id} className="rounded-xl border border-border-custom/30 bg-surface/50 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text-primary truncate">{call.title}</p>
            <span className="text-2xs text-text-muted shrink-0">
              {call.ai_status === 'done'
                ? `${OUTCOME_LABEL[call.ai_outcome ?? 'unclear']} · ${call.ai_score}/10`
                : call.ai_status === 'failed' ? 'Analiza nieudana' : 'Czeka na analizę'}
            </span>
          </div>
          <Moments title="Błędy" items={callMoments(call.ai_mistakes)} tone="bad" />
          <Moments title="Dobre zagrania" items={callMoments(call.ai_good_moves)} tone="good" />
          {call.ai_next_step && <p className="text-xs text-text-muted">Następny krok: {call.ai_next_step}</p>}
        </div>
      ))}
    </div>
  );
}
