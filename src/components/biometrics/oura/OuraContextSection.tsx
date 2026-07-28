import { Coffee, Dumbbell, Smartphone, Utensils } from 'lucide-react';
import type { OuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';

interface OuraContextSectionProps {
  context: OuraContextInsights | null | undefined;
  title?: string;
}

export function OuraContextSection({
  context,
  title = 'Kontekst przed snem',
}: OuraContextSectionProps) {
  if (!context) {
    return (
      <section className="rounded-xl border border-white/5 bg-surface-2 p-5">
        <h2 className="text-xl font-light text-white">Kontekst przed snem</h2>
        <p className="mt-2 text-sm text-text-muted">Brak zsynchronizowanych danych kontekstowych dla tej nocy.</p>
      </section>
    );
  }

  const cards = [
    {
      icon: Dumbbell,
      label: 'Trening',
      value: context.training.status === 'available'
        ? `${context.training.durationMinutes} min`
        : 'Nie zapisano treningu',
      detail: context.training.status === 'unavailable' || context.training.strainScore == null
        ? null
        : `Obciążenie ${context.training.strainScore}`,
      color: 'text-warning',
    },
    {
      icon: Smartphone,
      label: 'Ekran',
      value: context.screen.status === 'available'
        ? `${context.screen.totalMinutes ?? '—'} min`
        : 'Brak pomiaru czasu przed ekranem',
      detail: context.screen.lateNightMinutes == null
        ? null
        : `${context.screen.lateNightMinutes} min późnym wieczorem`,
      color: 'text-info',
    },
    {
      icon: Coffee,
      label: 'Kofeina',
      value: context.caffeine.status === 'available'
        ? `${context.caffeine.amountMg} mg`
        : 'Nie zapisano kofeiny',
      detail: context.caffeine.lastAt == null ? null : `Ostatnia o ${context.caffeine.lastAt}`,
      color: 'text-warning',
    },
    {
      icon: Utensils,
      label: 'Jedzenie',
      value: context.meals.status === 'available'
        ? `${context.meals.calories} kcal`
        : 'Nie zapisano posiłków',
      detail: context.meals.lastAt == null
        ? null
        : `Ostatni wpis ${context.meals.lastAt} · jakość ${context.meals.averageQuality ?? '—'}/10`,
      color: 'text-success',
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-light text-white">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">
          Fakty z dnia poprzedzającego sen {context.date}. To kontekst, nie dowód przyczynowości.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ color, detail, icon: Icon, label, value }) => (
          <article key={label} className="rounded-xl border border-white/5 bg-surface-2 p-5">
            <Icon className={color} size={22} />
            <p className="mt-8 text-sm text-text-secondary">{label}</p>
            <p className="mt-1 text-2xl font-light text-text-primary">{value}</p>
            {detail && <p className="mt-2 text-xs leading-5 text-text-muted">{detail}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
