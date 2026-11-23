import { useState } from 'react';
import { ClipboardList, Copy } from 'lucide-react';
import Button from '../../ui/Button';
import Sheet from '../../ui/Sheet';
import { Pressable } from '../../ui/ControlPrimitives';
import { notify } from '../../../lib/notify';
import { BASELINE_TESTS, baselineProgress, formatBaselineSummary } from '../../../lib/health/baselineTests';
import BaselineRow from './BaselineRow';
import { useBaselineResults } from './useBaselineResults';

function BaselineList({ userId }: { userId: string }) {
  const { results, isLoading, error, save, upload, removeVideo } = useBaselineResults(userId);
  const byKey = new Map(results.map((r) => [r.test_key, r]));
  const copy = async () => {
    try { await navigator.clipboard.writeText(formatBaselineSummary(results)); notify('Skopiowano wyniki dla trenera.', 'success'); }
    catch { notify('Nie udało się skopiować wyników.', 'error'); }
  };
  if (isLoading) return <p role="status" className="py-8 text-center text-xs text-text-muted">Wczytuję testy…</p>;
  if (error) return <p role="alert" className="py-8 text-center text-xs text-danger">Nie udało się wczytać testów.</p>;
  return (
    <div className="space-y-3 pb-4">
      <p className="text-xs text-text-muted">Testy od trenera: wpisz główną serię i swój max, nagraj wideo. Wpisy zapisują się po wyjściu z pola.</p>
      <ul className="list-none space-y-2 p-0">
        {BASELINE_TESTS.map((test, index) => (
          <BaselineRow
            key={test.key}
            test={test}
            result={byKey.get(test.key)}
            tone={index % 2 === 0 ? 'a' : 'b'}
            onSave={(patch) => save(test.key, patch)}
            onUpload={(file) => upload(test.key, file, byKey.get(test.key)?.video_path ?? null)}
            onRemoveVideo={(path) => void removeVideo(test.key, path)}
          />
        ))}
      </ul>
      <Button size="sm" variant="tonal" icon={<Copy size={14} />} onClick={() => void copy()}>Kopiuj wyniki dla trenera</Button>
    </div>
  );
}

/** Centrum Treningowe → „Pomiary wstępne”: testy od nowego trenera z miejscem na serię, max i wideo. */
export default function TrainingHubBaseline({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const { results } = useBaselineResults(userId);
  const { done, total } = baselineProgress(results);
  return (
    <>
      <Pressable onClick={() => setOpen(true)} className="trening-panel flex w-full cursor-pointer items-center gap-3 rounded-[var(--tren-radius-card)] p-3.5 text-left ui-interactive" aria-label="Otwórz pomiary wstępne">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"><ClipboardList size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary">Pomiary wstępne</span>
          <span className="block text-xs text-text-muted">Testy od trenera: seria, max i wideo</span>
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">{done}/{total}</span>
      </Pressable>
      <Sheet open={open} onOpenChange={setOpen} title="Pomiary wstępne" side="bottom" compact handleDragOnly>
        <BaselineList userId={userId} />
      </Sheet>
    </>
  );
}
