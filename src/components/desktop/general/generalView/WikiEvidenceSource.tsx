import { Pressable } from '../../../ui/ControlPrimitives';
import { formatMemorySourceDate, memorySourceLabel, type MemorySourceRef } from '../../../../lib/memorySourcesApi';
import { useMemorySource } from '../hooks/useMemorySource';

export default function WikiEvidenceSource({ userId, source }: { userId: string; source: MemorySourceRef }) {
  const state = useMemorySource(userId, source);
  return <WikiEvidenceSourceView source={source} state={state} />;
}

function WikiEvidenceSourceView({ source, state }: {
  source: MemorySourceRef;
  state: ReturnType<typeof useMemorySource>;
}) {
  return (
    <li className="space-y-2 rounded-xl border border-border-custom bg-surface-solid/40 p-3">
      <p className="text-xs font-semibold text-text-primary">{memorySourceLabel(source.table)}</p>
      <p className="text-2xs text-text-muted">{formatMemorySourceDate(source.date, source.date_precision)}</p>
      <p className="break-all text-2xs text-text-muted">Identyfikator: {source.id}</p>
      {source.quote ? <blockquote className="whitespace-pre-wrap break-words border-l-2 border-primary/30 pl-2 text-xs text-text-secondary">{source.quote}</blockquote>
        : <p className="text-xs text-text-muted">Brak zapisanego cytatu.</p>}
      {!state.opened ? <Pressable onClick={state.open} className="text-xs font-semibold text-primary">Pokaż oryginał</Pressable> : null}
      {state.opened && state.isFetching ? <p role="status" className="text-xs text-text-muted">Pobieranie źródła…</p> : null}
      {state.isError ? <div role="alert" className="space-y-1 text-xs text-text-muted">
        <p>Nie udało się pobrać źródła.</p>
        <Pressable onClick={() => void state.refetch()} className="font-semibold text-primary">Spróbuj ponownie</Pressable>
      </div> : null}
      {state.data?.status === 'missing' ? <p className="text-xs text-text-muted">Źródło usunięte lub niedostępne. Powyżej pozostał cytat z chwili kompilacji.</p> : null}
      {state.data?.status === 'unsupported' ? <p className="text-xs text-text-muted">Ten typ źródła nie obsługuje podglądu oryginału.</p> : null}
      {state.data?.status === 'available' ? <div className="space-y-2 border-t border-border-custom pt-2">
        <p className="text-2xs font-semibold text-text-muted">Oryginał · {source.table === 'vanguard_stream' ? 'Zapisano: ' : 'Data: '}{formatMemorySourceDate(state.data.date, state.data.date_precision)}</p>
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-text-primary">{state.data.text}</p>
      </div> : null}
    </li>
  );
}
