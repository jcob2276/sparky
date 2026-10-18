import { useState, type ReactNode } from 'react';
import { ChevronRight, Coffee, Dumbbell, Smartphone, Utensils } from 'lucide-react';
import type { OuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';
import { ScreenDetailModal } from './ScreenDetailModal';

interface OuraContextSectionProps {
  context: OuraContextInsights | null | undefined;
  title?: string;
  subtitle?: string;
}

interface ContextCardItem {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  detail: ReactNode | null;
  color: string;
  interactive?: boolean;
  onClick?: () => void;
  extra?: ReactNode;
}

function ContextCard({ color, detail, extra, icon: Icon, interactive, label, onClick, value }: ContextCardItem) {
  const Tag = interactive ? 'button' : 'article';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl border border-white/5 bg-surface-2 p-5 text-left transition-colors ${
        interactive ? 'cursor-pointer hover:border-border-focus hover:bg-surface-3' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon className={color} size={22} />
        {interactive && <span className="text-xs font-medium text-text-muted">Szczegóły</span>}
      </div>
      <p className="mt-8 text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-light text-text-primary">{value}</p>
      {extra}
      {detail && <div className="mt-2 text-xs leading-5 text-text-muted">{detail}</div>}
    </Tag>
  );
}

export function OuraContextSection({
  context,
  title = 'Kontekst przed snem',
  subtitle,
}: OuraContextSectionProps) {
  const [screenModalOpen, setScreenModalOpen] = useState(false);

  if (!context) {
    return (
      <section className="rounded-xl border border-white/5 bg-surface-2 p-5">
        <h2 className="text-xl font-light text-white">Kontekst przed snem</h2>
        <p className="mt-2 text-sm text-text-muted">Brak zsynchronizowanych danych kontekstowych dla tej nocy.</p>
      </section>
    );
  }

  const isScreenAvailable = context.screen.status === 'available';
  const sourceFailed = (source: string) => context.sourceErrors?.some((error) => error.source === source) ?? false;
  const phoneFailed = sourceFailed('phone_usage_daily');
  const workoutFailed = sourceFailed('workout_sessions');
  const foodFailed = sourceFailed('daily_food_entries');
  const readFailure = <span className="text-warning">Nie udało się odczytać części danych.</span>;
  const withReadFailure = (detail: ReactNode, failed: boolean): ReactNode => (
    failed ? <span className="flex flex-col gap-1">{detail}{readFailure}</span> : detail
  );

  const cards: ContextCardItem[] = [
    {
      icon: Dumbbell,
      label: 'Trening',
      value: context.training.status === 'available'
        ? `${context.training.durationMinutes} min`
        : workoutFailed ? 'Dane chwilowo niedostępne' : 'Nie zapisano treningu',
      detail: withReadFailure(
        context.training.status === 'unavailable' || context.training.strainScore == null
          ? null
          : `Obciążenie ${context.training.strainScore}`,
        workoutFailed,
      ),
      color: 'text-warning',
    },
    {
      icon: Smartphone,
      label: 'Ekran',
      value: isScreenAvailable
        ? (context.screen.formattedTotal ?? `${context.screen.totalMinutes ?? '—'} min`)
        : phoneFailed ? 'Dane chwilowo niedostępne' : 'Brak pomiaru czasu przed ekranem',
      detail: withReadFailure(isScreenAvailable ? (
        <span className="flex flex-col gap-1">
          {context.screen.lateNightMinutes != null ? (
            <span
              className="flex flex-wrap items-center gap-1.5"
              title="Okno nocne obejmuje wyłącznie godziny 23:00–24:00 oraz 00:00–04:00 czasu warszawskiego tego samego dnia kalendarzowego. Nie obejmuje wcześniejszego wieczoru (np. 20:00–22:59)."
            >
              <span>
                {context.screen.lateNightMinutes === 0
                  ? '0 min w oknie nocnym (23:00–04:00 · bez 20:00–22:59)'
                  : `${context.screen.lateNightMinutes} min w oknie nocnym (23:00–04:00 · bez 20:00–22:59)`}
              </span>
            </span>
          ) : (
            <span className="text-xs text-text-muted">Brak pomiaru okna nocnego (23:00–04:00)</span>
          )}
          {context.screen.unlocks != null && context.screen.unlocks > 0 && (
            <span className="text-xs text-text-muted">
              {context.screen.unlocks} odblokowań
              {(context.screen.cognitiveProfile?.avgSessionMinutes ?? context.screen.cognitiveProfile?.unlockIntervalMinutes)
                ? ` · śr. ~${context.screen.cognitiveProfile?.avgSessionMinutes ?? context.screen.cognitiveProfile?.unlockIntervalMinutes} min / sesja`
                : ''}
            </span>
          )}
        </span>
      ) : null, phoneFailed),
      color: 'text-info',
      interactive: isScreenAvailable,
      onClick: isScreenAvailable ? () => setScreenModalOpen(true) : undefined,
      extra: isScreenAvailable && context.screen.categoryMinutesComplete && context.screen.cognitiveProfile && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
            {context.screen.cognitiveProfile.toolRatio > 0 && (
              <div
                className="bg-primary"
                style={{ width: `${Math.min(context.screen.cognitiveProfile.toolRatio, 100)}%` }}
                title={`Narzędzia: ${context.screen.cognitiveProfile.toolRatio}%`}
              />
            )}
            {context.screen.cognitiveProfile.passiveRatio > 0 && (
              <div
                className="bg-warning"
                style={{ width: `${Math.min(context.screen.cognitiveProfile.passiveRatio, 100 - context.screen.cognitiveProfile.toolRatio)}%` }}
                title={`Social/Rozrywka: ${context.screen.cognitiveProfile.passiveRatio}%`}
              />
            )}
          </div>
          <span className="flex items-center text-xs text-text-muted hover:text-text-primary">
            Szczegóły <ChevronRight size={12} className="ml-0.5" />
          </span>
        </div>
      ),
    },
    {
      icon: Coffee,
      label: 'Kofeina',
      value: context.caffeine.status === 'available'
        ? `~${context.caffeine.amountMg} mg (szacunek)`
        : foodFailed ? 'Dane chwilowo niedostępne' : 'Nie zapisano kofeiny',
      detail: withReadFailure(context.caffeine.lastAt == null ? null : `Szacunek z wpisów · czas wpisu ${context.caffeine.lastAt}`, foodFailed),
      color: 'text-warning',
    },
    {
      icon: Utensils,
      label: 'Jedzenie',
      value: context.meals.status === 'available'
        ? `${context.meals.calories} kcal`
        : foodFailed ? 'Dane chwilowo niedostępne' : 'Nie zapisano posiłków',
      detail: withReadFailure(context.meals.lastAt == null
        ? null
        : `Ostatni wpis ${context.meals.lastAt} · jakość ${context.meals.averageQuality ?? '—'}/10`, foodFailed),
      color: 'text-success',
    },
  ];

  const resolvedSubtitle = subtitle ?? (
    title.toLowerCase().includes('dnia')
      ? `Fakty z dnia ${context.date}. To kontekst, nie dowód przyczynowości.`
      : `Fakty z dnia poprzedzającego sen ${context.date}. To kontekst, nie dowód przyczynowości.`
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-light text-white">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{resolvedSubtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => <ContextCard key={card.label} {...card} />)}
      </div>

      <ScreenDetailModal
        isOpen={screenModalOpen}
        onClose={() => setScreenModalOpen(false)}
        screen={context.screen}
        date={context.date}
      />
    </section>
  );
}
