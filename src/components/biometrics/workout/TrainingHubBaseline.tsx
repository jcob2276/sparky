import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import Sheet from '../../ui/Sheet';
import { Pressable } from '../../ui/ControlPrimitives';
import { BASELINE_TESTS, baselineProgress } from '../../../lib/health/baselineTests';
import BaselineRow from './BaselineRow';
import { useBaselineResults } from './useBaselineResults';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <span className="meal-bar-track block h-1.5 overflow-hidden rounded-full" aria-hidden="true">
      <span className="block h-full w-full origin-left rounded-full bg-primary transition-transform" style={{ transform: `scaleX(${ratio})` }} />
    </span>
  );
}

function BaselineList({ userId }: { userId: string }) {
  const { results, isLoading, error, save, upload, removeVideo } = useBaselineResults(userId);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const byKey = new Map(results.map((r) => [r.test_key, r]));
  const { done, total } = baselineProgress(results);
  if (isLoading) return <p role="status" className="py-8 text-center text-xs text-text-muted">Wczytuję testy…</p>;
  if (error) return <p role="alert" className="py-8 text-center text-xs text-danger">Nie udało się wczytać testów.</p>;
  return (
    <div className="space-y-3 pb-6">
      <div className="space-y-2 rounded-2xl border border-border-custom bg-surface p-3">
        <p className="text-sm font-semibold text-text-primary">Wykonano <span className="tabular-nums">{done}</span> z <span className="tabular-nums">{total}</span></p>
        <ProgressBar done={done} total={total} />
        <p className="text-2xs text-text-muted">Dotknij testu, żeby wpisać serie i max oraz dodać wideo.</p>
      </div>
      <details className="rounded-2xl border border-border-custom bg-surface p-3 text-xs text-text-secondary">
        <summary className="cursor-pointer text-sm font-semibold text-text-primary">Jak robić testy (wg trenera)</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 leading-snug">
          <li>Główne serie to serie, w których stopniowo zwiększasz trudność: ciężar, powtórzenia albo samo ćwiczenie, aż dojdziesz do maksa.</li>
          <li>Test z ciężarem (np. dipy, stary max 40 kg): lekka seria bez ciężaru, potem 25% starego maksa, 50% (2 serie), 75% (2 serie, mało powtórzeń: 1–2), na końcu 90% i 100%. Przycisk „Podpowiedz serie” wylicza to z Twojego starego maksa.</li>
          <li>Nie wiesz, jak to zrobić? Rozgrzej się, dojdź do starych maksów i zrób na nich połowę powtórzeń albo max reps. Możesz też zrobić max reps z połową ciężaru starego maksa.</li>
          <li>Pomiar ma być szacunkowy, nie idealny.</li>
        </ul>
      </details>
      <ul className="list-none space-y-1.5 p-0">
        {BASELINE_TESTS.map((test, index) => (
          <BaselineRow
            key={test.key}
            test={test}
            result={byKey.get(test.key)}
            tone={index % 2 === 0 ? 'a' : 'b'}
            expanded={openKey === test.key}
            onToggle={() => setOpenKey((current) => (current === test.key ? null : test.key))}
            onSave={(patch) => save(test.key, patch)}
            onUpload={(file) => upload(test.key, file, byKey.get(test.key)?.video_path ?? null)}
            onRemoveVideo={(path) => void removeVideo(test.key, path)}
          />
        ))}
      </ul>
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
      <Pressable onClick={() => setOpen(true)} className="trening-panel block w-full cursor-pointer space-y-2.5 rounded-[var(--tren-radius-card)] p-3.5 text-left ui-interactive" aria-label="Otwórz pomiary wstępne">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><ClipboardList size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-primary">Pomiary wstępne</span>
            <span className="block text-xs text-text-muted">Testy od trenera: seria, max i wideo</span>
          </span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">{done}/{total}</span>
        </span>
        <ProgressBar done={done} total={total} />
      </Pressable>
      <Sheet open={open} onOpenChange={setOpen} title="Pomiary wstępne" side="bottom" compact handleDragOnly>
        <BaselineList userId={userId} />
      </Sheet>
    </>
  );
}
