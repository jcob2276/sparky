import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSessionActivity, revokeSession, revokeOtherSessions, type SessionActivity } from '../../lib/authSessionsApi';
import { userSettingsKeys } from '../../lib/queryKeys';
import { confirmDialog, notify } from '../../lib/notify';
import ActiveSessionsView from './ActiveSessionsView';
import { sessionDeviceLabel } from './sessionDeviceLabel';

export default function ActiveSessionsCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: userSettingsKeys.sessions(userId),
    queryFn: fetchSessionActivity,
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: 60_000,
  });
  const mutation = useMutation({
    mutationFn: async (target: SessionActivity | 'others') => {
      if (target === 'others') await revokeOtherSessions();
      else await revokeSession(target);
    },
    onSuccess: async (_data, target) => {
      notify(target === 'others' ? 'Pozostałe sesje zostały wylogowane.' : 'Sesja została wylogowana.', 'success');
      if (target === 'others' || !target.is_current) {
        await queryClient.invalidateQueries({ queryKey: userSettingsKeys.sessions(userId) });
      }
    },
    onError: error => { notify(error.message, 'error'); },
  });
  const end = async (target: SessionActivity | 'others') => {
    const message = target === 'others' ? 'Wylogować wszystkie pozostałe sesje? Ta sesja pozostanie zalogowana.'
      : target.is_current ? 'Wylogować Cię na tym urządzeniu?'
        : `Wylogować sesję ${sessionDeviceLabel(target.user_agent)} (IP: ${target.ip || 'brak danych'})?`;
    if (await confirmDialog(message)) mutation.mutate(target);
  };

  return <ActiveSessionsView sessions={query.data} loading={query.isPending}
    observedAt={query.dataUpdatedAt}
    refreshing={query.isFetching} error={query.isError}
    ending={mutation.isPending ? mutation.variables === 'others' ? 'others' : mutation.variables?.id ?? null : null}
    actionError={mutation.error?.message ?? null}
    onEnd={session => { void end(session); }} onEndOthers={() => { void end('others'); }}
    onRefresh={() => { void query.refetch(); }} />;
}
