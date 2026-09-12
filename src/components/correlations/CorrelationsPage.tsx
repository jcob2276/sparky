import CorrelationCard from './CorrelationCard';
import CorrelationsHeader from './CorrelationsHeader';
import { useCorrelationsData } from './hooks/useCorrelationsData';
import { Card } from '../ui/Card';
import Spinner from '../ui/Spinner';

export default function CorrelationsPage() {
  const {
    userId,
    strongSignals,
    hypotheses,
    sparseMetrics,
    daysOfData,
    loading,
    error,
    load,
  } = useCorrelationsData();

  if (!userId) return null;

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex flex-col">
      <CorrelationsHeader loading={loading} onRefresh={load} daysOfData={daysOfData} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-20">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
            <Spinner size="lg" />
            <p className="text-sm font-medium">Analizuję Twoje wzorce…</p>
          </div>
        )}

        {error && !loading && (
          <Card variant="outline" padding="1.5rem" className="border-danger/20 bg-danger/5">
            <p className="text-sm font-bold text-danger">Nie udało się załadować analizy</p>
            <p className="text-xs text-text-muted mt-1">{error}</p>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* ── SECTION 1: Strong signals ── */}
            <section className="space-y-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">
                  Co wiemy na pewno
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Wzorce z wystarczającą ilością danych i stabilne w czasie
                </p>
              </div>

              {strongSignals.length === 0 ? (
                <Card variant="outline" padding="2rem" className="text-center border-dashed">
                  <p className="text-sm font-bold text-text-secondary">Brak pewnych sygnałów jeszcze</p>
                  <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto">
                    Potrzebujesz co najmniej 12–25 dni logowania konkretnego czynnika, żeby system mógł
                    wyciągnąć wiarygodny wniosek.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {strongSignals.map(f => (
                    <CorrelationCard
                      key={f.id}
                      item={f}
                      showChart={f.evidence_level === 'confirmed' || f.evidence_level === 'probable'}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── SECTION 2: Weak signals / hypotheses ── */}
            {hypotheses.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">
                    Sygnały do obserwacji
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Trend istnieje, ale za mało danych żeby być pewnym — zbieraj dalej
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {hypotheses.map(f => (
                    <CorrelationCard key={f.id} item={f} showChart={false} />
                  ))}
                </div>
              </section>
            )}

            {/* ── SECTION 3: Sparse data / what to log ── */}
            {sparseMetrics.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">
                    Czego jeszcze nie wiemy
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Te czynniki są logowane za rzadko — poniżej co robić
                  </p>
                </div>
                <div className="space-y-2">
                  {sparseMetrics.map(m => (
                    <div
                      key={m.key}
                      className="flex items-start gap-3 rounded-xl border border-border-custom/60 bg-surface-solid/30 px-4 py-3"
                    >
                      {/* Progress bar as left indicator */}
                      <div className="mt-1 shrink-0">
                        <div className="h-8 w-1.5 rounded-full bg-border-custom/40 overflow-hidden">
                          <div
                            className="w-full rounded-full bg-primary/50 transition-all duration-500"
                            style={{ height: `${m.pct}%`, marginTop: `${100 - m.pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-text-primary">{m.label}</p>
                        <p className="text-2xs text-text-muted mt-0.5">{m.action}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-text-secondary">{m.n}<span className="text-text-muted font-normal">/{25}</span></p>
                        <p className="text-2xs text-text-muted">dni</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Empty state: nothing at all ── */}
            {strongSignals.length === 0 && hypotheses.length === 0 && sparseMetrics.length === 0 && (
              <Card variant="outline" padding="2.5rem" className="text-center border-dashed">
                <p className="text-base font-black text-text-secondary">Brak danych do analizy</p>
                <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto leading-relaxed">
                  Loguj posiłki, treningi i uzupełniaj nawyki przez kilka tygodni — system sam zacznie znajdować wzorce.
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
