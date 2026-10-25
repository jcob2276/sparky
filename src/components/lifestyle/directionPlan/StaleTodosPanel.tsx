import { useQuery } from '@tanstack/react-query';
import { todoKeys } from '../../../lib/queryKeys';
import { listStaleTodos, STALE_TODO_MIN_DAYS } from '../../../lib/todo/staleTodosApi';
import { useUserId } from '../../../store/useStore';

export default function StaleTodosPanel() {
  const userId = useUserId();
  const { data: stale = [] } = useQuery({
    queryKey: todoKeys.stale(userId ?? ''),
    queryFn: () => listStaleTodos(userId!),
    enabled: !!userId,
  });
  if (stale.length === 0) return null;
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 px-3.5 py-3 space-y-2">
      <div>
        <p className="text-2xs font-semibold text-warning">Leżą bez ruchu (ponad {STALE_TODO_MIN_DAYS} dni)</p>
        <p className="mt-0.5 text-xs text-text-secondary leading-snug">
          Na każde: zrób w tym tygodniu, rozbij na pierwszy krok albo skasuj.
        </p>
      </div>
      <ul className="space-y-1">
        {stale.map((todo) => (
          <li key={todo.id} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 font-semibold text-text-primary">{todo.title}</span>
            <span className="shrink-0 font-semibold text-text-muted">{todo.daysIdle} dni</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
