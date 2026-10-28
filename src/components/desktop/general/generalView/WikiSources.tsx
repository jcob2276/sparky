import type { MemorySourceRef } from '../../../../lib/memorySourcesApi';
import { Pressable } from '../../../ui/ControlPrimitives';
import SectionTitle from '../../../ui/SectionTitle';
import { useWikiSources } from '../hooks/useWikiSources';
import WikiEvidenceSource from './WikiEvidenceSource';

interface WikiSourcesProps {
  userId: string;
  pageId: string;
  legacyRefs: MemorySourceRef[];
}

export default function WikiSources(props: WikiSourcesProps) {
  const state = useWikiSources(props.userId, props.pageId);
  return <WikiSourcesView {...props} state={state} />;
}

function WikiSourcesView({ userId, legacyRefs, state }: WikiSourcesProps & {
  state: ReturnType<typeof useWikiSources>;
}) {
  const refs: MemorySourceRef[] = state.data?.length ? state.data.map(source => ({
    table: source.source_table, id: source.source_id, date: source.source_date,
    date_precision: 'timestamp', quote: source.quote,
  })) : legacyRefs.slice(0, 8);

  return <div className="space-y-2">
    <SectionTitle as="h4">Źródła</SectionTitle>
    {state.isLoading ? <p role="status" className="text-xs text-text-muted">Pobieranie źródeł…</p>
      : state.isError ? <div role="alert" className="space-y-1 text-xs text-text-muted">
        <p>Nie udało się pobrać źródeł strony.</p>
        <Pressable onClick={() => void state.refetch()} className="font-semibold text-primary">Spróbuj ponownie</Pressable>
      </div> : <>
        <p className="text-2xs text-text-muted">Cytaty pochodzą z chwili kompilacji. Podgląd oryginału pobiera bieżący zapis.</p>
        {refs.length ? <ul className="space-y-2">
          {refs.map((source, index) => <WikiEvidenceSource key={`${source.table}:${source.id}:${index}`} userId={userId} source={source} />)}
        </ul> : <p className="text-xs text-text-muted">Brak odnośników do źródeł. Tego wniosku nie można tu zweryfikować.</p>}
      </>}
  </div>;
}
