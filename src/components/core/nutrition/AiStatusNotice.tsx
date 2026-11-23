import { useQuery } from '@tanstack/react-query';
import { aiStatusNotices, fetchAiStatus } from '../../../lib/health/aiStatus';

/** Mówi wprost, gdy zdjęcia lub rozpoznawanie tekstem nie działają (limit, brak środków), zamiast ogólnego błędu. */
export default function AiStatusNotice({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['ai-status', userId],
    queryFn: () => fetchAiStatus(userId),
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });
  const notices = aiStatusNotices(data ?? []);
  if (!notices.length) return null;
  return (
    <div role="status" className="space-y-0.5 rounded-lg bg-warning/10 px-3 py-2">
      {notices.map((message) => <p key={message} className="text-xs font-medium text-warning">{message}</p>)}
    </div>
  );
}
