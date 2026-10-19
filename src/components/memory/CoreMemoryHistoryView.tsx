import { Pressable } from '../ui/ControlPrimitives';
import { MEMORY_BLOCK_LABELS, readMemoryValue } from '../../lib/coreMemoryHistory';
import { formatLongDateWarsaw } from '../../lib/date';
import type { useCoreMemoryHistory } from './useCoreMemoryHistory';

type Props = ReturnType<typeof useCoreMemoryHistory>;
export default function CoreMemoryHistoryView(props: Props) {
  return <details className="rounded-xl border border-border-custom p-4" open={props.expanded}
    onToggle={event => props.onExpand(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold">Pamięć Sparky i historia zmian</summary>
    <div className="mt-3 space-y-3 text-xs">
      <p className="text-text-muted">Zapisane deklaracje i kontekst rozmowy. Historia obejmuje zmiany od uruchomienia jej zapisu.</p>
      {props.loading && <p role="status">Wczytywanie…</p>}
      {props.error && <p role="alert">Nie udało się wykonać operacji. Wpis mógł się zmienić — odśwież historię przed ponowieniem.</p>}
      <Pressable variant="ghost" size="sm" onClick={props.onRefresh} disabled={props.loading || props.restoring}>Odśwież</Pressable>
      {props.current.map(item => {
        const value = readMemoryValue(item.value);
        return <div key={item.id} className="rounded-lg bg-surface-solid p-3">
          <p className="font-semibold">{MEMORY_BLOCK_LABELS[item.key] ?? 'Zapis pamięci'}</p>
          <p className="mt-1 whitespace-pre-wrap">{value.text}</p>
          <p className="mt-1 text-text-muted">{!item.is_active ? 'Nieaktywny' : value.expired ? 'Wygasł' : !value.restorable ? 'Wymaga sprawdzenia' : 'Aktywny'} · {formatLongDateWarsaw(item.updated_at)}</p>
        </div>;
      })}
      {!props.loading && !props.error && !props.current.length && <p>Brak zapisanych bloków pamięci.</p>}
      {props.restored && <p role="status">Przywrócono wersję. Sparky odczyta ją przy kolejnej odpowiedzi.</p>}
      <p className="font-semibold">Poprzednie wersje</p>
      {!props.loading && !props.error && !props.revisions.length && <p className="text-text-muted">Nie zapisano jeszcze zmian.</p>}
      {props.revisions.map(revision => {
        const value = readMemoryValue(revision.new_value);
        const oldValue = readMemoryValue(revision.old_value);
        const current = props.current.find(item => item.id === revision.preference_id);
        const same = current?.value === revision.new_value && current?.is_active === revision.new_is_active;
        const oldSame = current?.value === revision.old_value && current?.is_active === revision.old_is_active;
        return <div key={revision.id} className="border-t border-border-custom py-3">
          <p className="font-semibold">{MEMORY_BLOCK_LABELS[revision.key] ?? 'Zapis pamięci'} · {formatLongDateWarsaw(revision.changed_at)}</p>
          <p className="mt-1 text-text-muted">Poprzednio: {oldValue.text}</p>
          {revision.old_value && current && !oldSame && oldValue.restorable && <Pressable variant="ghost" size="sm" disabled={props.restoring}
            onClick={() => props.onRestore(revision, 'old')}>Przywróć poprzednią wersję</Pressable>}
          {oldValue.expired && <p className="mt-1 text-text-muted">Poprzedni wpis wygasł — nie można przedłużyć jego ważności przez przywrócenie.</p>}
          <p className="mt-1 whitespace-pre-wrap">{revision.operation === 'delete' ? 'Usunięto wpis' : value.text}</p>
          {revision.new_value && current && !same && value.restorable && <Pressable variant="ghost" size="sm" disabled={props.restoring}
            onClick={() => props.onRestore(revision, 'new')}>Przywróć tę wersję</Pressable>}
          {value.expired && <p className="mt-1 text-text-muted">Wpis wygasł — przywrócenie nie przedłuża jego ważności.</p>}
        </div>;
      })}
      {props.hasMore && <Pressable variant="ghost" size="sm" disabled={props.loading} onClick={props.onLoadMore}>Pokaż starsze zmiany</Pressable>}
    </div>
  </details>;
}
