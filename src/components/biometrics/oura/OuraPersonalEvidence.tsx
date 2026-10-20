import { Activity, Link2 } from 'lucide-react';
import { classifyImpactFactors } from '@vanguard/domain';
import {
  selectActionableBehaviorEffects,
  selectActionableSleepFactors,
} from '../../../lib/biometrics/ouraEvidence';
import type { OuraHealthHubData } from './types';
import DataStateNotice from '../../core/DataStateNotice';
import { filterLoadBehaviors, filterLoadCorrelations } from './loadEvidenceFilter';

const recoveryMetric = (metric: string) => /readiness|recovery|hrv|rhr|sleep|sen/i.test(metric);

/**
 * „Obciążenie → regeneracja”: strain, kroki i trening a gotowość/regeneracja.
 * Tematy z silnika snu (kawa, telefon, posiłek, odstęp od treningu) są odfiltrowane.
 */
export function OuraPersonalEvidence({ data }: { data: OuraHealthHubData }) {
  const correlations = selectActionableSleepFactors(classifyImpactFactors(
    filterLoadCorrelations(
      (data.correlations?.correlations ?? [])
        .filter((item) => recoveryMetric(item.y_metric) || recoveryMetric(item.y_label)),
    ),
  )).slice(0, 4);
  const behaviors = filterLoadBehaviors(selectActionableBehaviorEffects(
    (data.correlations?.behaviors ?? []).filter((item) => recoveryMetric(item.outcome_metric)),
  )).slice(0, 4);
  const hasEvidence = correlations.length > 0 || behaviors.length > 0;
  const readFailed = Boolean(data.correlationsError || data.correlations?.sourceErrors?.length);
  const loading = Boolean(data.correlationsLoading && !hasEvidence);

  return (
    <section className="space-y-3" aria-labelledby="load-evidence-title">
      <div>
        <h3 id="load-evidence-title" className="text-xl font-light text-text-primary">Obciążenie → regeneracja</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Jak wysiłek i kroki przekładają się na gotowość następnego dnia.
        </p>
      </div>
      {readFailed && <DataStateNotice tone="warning"
        title={hasEvidence ? 'Część zależności jest niedostępna' : 'Zależności są chwilowo niedostępne'}
        detail="Nie udało się pobrać wszystkich wyników. Zachowujemy dostępne zależności. Odśwież stronę, aby ponowić odczyt." />}
      {loading ? <DataStateNotice tone="loading" title="Wczytuję osobiste zależności…" /> : !hasEvidence ? !readFailed && (
        <article className="rounded-xl border border-white/5 bg-surface-1 p-5">
          <p className="text-lg text-text-primary">Trwa kalibracja zależności</p>
          <p className="mt-2 text-sm text-text-secondary">
            Potrzeba kilku podobnych treningów i nocy po nich, aby uczciwie porównać wyniki.
          </p>
        </article>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {correlations.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/5 bg-surface-2 p-5">
              <Link2 className="text-info" size={20} aria-hidden="true" />
              <p className="mt-4 text-sm text-text-secondary">{item.x_label} → {item.y_label}</p>
              <p className="mt-2 text-lg text-text-primary">{item.summary}</p>
              <p className="mt-2 text-xs text-text-muted">
                {item.evidence_level === 'confirmed' ? 'Potwierdzony sygnał' : 'Prawdopodobny sygnał'}
                {' '}· n={item.n} · r={item.r.toFixed(2)}
              </p>
            </li>
          ))}
          {behaviors.map((item) => (
            <li key={`${item.behavior_key}-${item.outcome_metric}`} className="rounded-xl border border-white/5 bg-surface-2 p-5">
              <Activity className="text-success" size={20} aria-hidden="true" />
              <p className="mt-4 text-sm text-text-secondary">{item.behavior_key.replaceAll('_', ' ')}</p>
              <p className="mt-2 text-lg text-text-primary">
                {item.delta == null ? 'Jeszcze bez wiarygodnej różnicy' : `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} pkt następnego dnia`}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                {item.n_with} dni z · {item.n_without} bez · {item.confidence}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
