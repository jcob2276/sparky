import { Coffee, Dumbbell, Smartphone, Utensils } from 'lucide-react';
import type { OuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';

interface OuraContextSectionProps {
  context: OuraContextInsights | null | undefined;
}

export function OuraContextSection({ context }: OuraContextSectionProps) {
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
        : 'Brak danych',
      detail: context.training.strainScore == null ? 'workout_sessions' : `Obciążenie ${context.training.strainScore} · workout_sessions`,
      color: 'text-warning',
    },
    {
      icon: Smartphone,
      label: 'Ekran',
      value: context.screen.status === 'available'
        ? `${context.screen.totalMinutes ?? '—'} min`
        : 'Brak danych',
      detail: context.screen.lateNightMinutes == null ? 'phone_usage_daily' : `${context.screen.lateNightMinutes} min późnym wieczorem · phone_usage_daily`,
      color: 'text-info',
    },
    {
      icon: Coffee,
      label: 'Kofeina',
      value: context.caffeine.status === 'available'
        ? `${context.caffeine.amountMg} mg`
        : 'Brak danych',
      detail: context.caffeine.lastAt == null ? 'daily_food_entries' : `Ostatnia o ${context.caffeine.lastAt} · daily_food_entries`,
      color: 'text-warning',
    },
    {
      icon: Utensils,
      label: 'Jedzenie',
      value: context.meals.status === 'available'
        ? `${context.meals.calories} kcal`
        : 'Brak danych',
      detail: context.meals.lastAt == null ? 'daily_food_entries' : `Ostatni wpis ${context.meals.lastAt} · jakość ${context.meals.averageQuality ?? '—'}/10`,
      color: 'text-success',
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-light text-white">Kontekst przed snem</h2>
        <p className="mt-1 text-sm text-text-muted">
          Fakty z dnia poprzedzającego sen {context.date}. To kontekst, nie dowód przyczynowości.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ color, detail, icon: Icon, label, value }) => (
          <article key={label} className="rounded-xl border border-white/5 bg-surface-2 p-5">
            <Icon className={color} size={22} />
            <p className="mt-8 text-sm text-text-secondary">{label}</p>
            <p className="mt-1 text-3xl font-light text-white">{value}</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
