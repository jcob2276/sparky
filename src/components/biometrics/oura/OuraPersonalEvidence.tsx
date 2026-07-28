import { Activity, FlaskConical, Link2 } from 'lucide-react';
import { classifyImpactFactors } from '@vanguard/domain';
import {
  selectActionableBehaviorEffects,
  selectActionableSleepFactors,
} from '../../../lib/biometrics/ouraEvidence';
import type { OuraHealthHubData } from './types';

const sleepMetric = (metric: string) => (
  /sleep|sen|readiness|recovery|hrv|rhr/i.test(metric)
);

const activityBehavior = (key: string) => (
  /train|workout|exercise|activity|cardio|strength|run|walk|steps/i.test(key)
);

export function OuraPersonalEvidence({ data }: { data: OuraHealthHubData }) {
  const correlations = selectActionableSleepFactors(classifyImpactFactors(
    (data.correlations?.correlations ?? [])
      .filter((item) => sleepMetric(item.y_metric) || sleepMetric(item.y_label)),
  ))
    .slice(0, 3);
  const allBehaviors = selectActionableBehaviorEffects(
    (data.correlations?.behaviors ?? [])
      .filter((item) => sleepMetric(item.outcome_metric)),
  );
  const behaviors = allBehaviors.slice(0, 3);
  const activityCosts = allBehaviors.filter(
    (item) => activityBehavior(item.behavior_key),
  ).slice(0, 2);
  const hasEvidence = correlations.length > 0 || behaviors.length > 0;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-xl font-light text-white">
          <FlaskConical className="text-info" size={20} /> Co działa u Ciebie
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          Osobiste zależności statystyczne — nie ogólne porady i nie dowód przyczynowości.
        </p>
      </div>
      {!hasEvidence ? (
        <article className="rounded-xl border border-white/5 bg-surface-1 p-5">
          <p className="text-lg text-white">Trwa kalibracja zależności</p>
          <p className="mt-2 text-sm text-text-secondary">
            Potrzeba powtarzalnych zachowań i kolejnych nocy, aby uczciwie porównać wyniki.
          </p>
        </article>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {correlations.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/5 bg-surface-2 p-5">
              <Link2 className="text-info" size={20} />
              <p className="mt-5 text-sm text-text-secondary">{item.x_label} → {item.y_label}</p>
              <p className="mt-2 text-lg text-white">{item.summary}</p>
              <p className="mt-2 text-xs text-text-muted">
                {item.evidence_level === 'confirmed' ? 'Potwierdzony sygnał' : 'Prawdopodobny sygnał'}
                {' '}· n={item.n} · r={item.r.toFixed(2)}
              </p>
            </article>
          ))}
          {behaviors.map((item) => (
            <article key={`${item.behavior_key}-${item.outcome_metric}`} className="rounded-xl border border-white/5 bg-surface-2 p-5">
              <Activity className="text-success" size={20} />
              <p className="mt-5 text-sm text-text-secondary">{item.behavior_key.replaceAll('_', ' ')}</p>
              <p className="mt-2 text-lg text-white">
                {item.delta == null ? 'Jeszcze bez wiarygodnej różnicy' : `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} pkt następnego dnia`}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                {item.n_with} dni z · {item.n_without} bez · {item.confidence}
              </p>
            </article>
          ))}
        </div>
      )}
      <div className="pt-2">
        <h3 className="flex items-center gap-2 text-xl font-light text-white">
          <Activity className="text-warning" size={20} /> Koszt aktywności
        </h3>
        {activityCosts.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            Kalibracja: potrzeba kilku podobnych treningów i nocy po nich, aby pokazać Twój koszt regeneracyjny.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {activityCosts.map((item) => (
              <article key={`activity-${item.behavior_key}`} className="rounded-xl border border-white/5 bg-surface-2 p-4">
                <p className="text-sm text-text-secondary">{item.behavior_key.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-lg text-white">
                  {item.delta == null ? 'Kalibracja' : `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} pkt regeneracji`}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  następnego dnia · {item.n_with} obserwacji
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
