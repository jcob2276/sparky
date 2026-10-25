import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCloserCalls, fetchCloserCall, saveCloserCallNotes, type CloserCallSummary } from '../../../lib/closer/closerCallsApi';
import { closerKeys } from '../../../lib/queryKeys';
import CloserCallsView from './CloserCallsView';

export default function CloserCallsList({ userId }: { userId: string; date: string }) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryKey = closerKeys.library(userId);
  const query = useQuery({ queryKey, queryFn: () => fetchCloserCalls(userId), enabled: !!userId });
  const detail = useQuery({ queryKey: closerKeys.call(userId, selectedId ?? ''),
    queryFn: () => fetchCloserCall(userId, selectedId!), enabled: !!userId && !!selectedId });
  const save = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => saveCloserCallNotes(userId, id, notes),
    onSuccess: saved => {
      client.setQueryData(closerKeys.call(userId, saved.id), saved);
      client.setQueryData<CloserCallSummary[]>(queryKey, previous => previous?.map(call =>
        call.id === saved.id ? { ...call, review_notes: saved.review_notes } : call));
    },
  });
  const select = (id: string | null) => { save.reset(); setSelectedId(id); };
  return <CloserCallsView calls={query.data ?? []} loading={query.isPending} error={query.isError}
    selected={detail.data} detailLoading={!!selectedId && detail.isPending} detailError={!!selectedId && detail.isError}
    onSelect={select} saving={save.isPending} saveError={save.isError}
    onSaveNotes={notes => { if (selectedId) save.mutate({ id: selectedId, notes }); }} />;
}

