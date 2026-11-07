import { useQuery } from '@tanstack/react-query';
import { fetchActiveSessions } from '../../lib/authSessionsApi';
import { userSettingsKeys } from '../../lib/queryKeys';
import ActiveSessionsView from './ActiveSessionsView';

export default function ActiveSessionsCard({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: userSettingsKeys.sessions(userId),
    queryFn: fetchActiveSessions,
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: 60_000,
  });

  return <ActiveSessionsView sessions={query.data} loading={query.isPending}
    refreshing={query.isFetching} error={query.isError}
    onRefresh={() => { void query.refetch(); }} />;
}
