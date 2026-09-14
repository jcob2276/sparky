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

  const cards: ContextCardItem[] = [
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
      value: isScreenAvailable
        ? (context.screen.formattedTotal ?? `${context.screen.totalMinutes ?? '—'} min`)
        : 'Brak pomiaru czasu przed ekranem',
      detail: isScreenAvailable ? (
        <span className="flex flex-col gap-1">
          {context.screen.lateNightMinutes != null && context.screen.lateNightMinutes > 0 && (
            <span className="flex flex-wrap items-center gap-1.5">
              <span>{context.screen.lateNightMinutes} min późnym wieczorem</span>
              {context.screen.lateNightImpact && (
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${context.screen.lateNightImpact.bgColor} ${context.screen.lateNightImpact.color}`}>
                  {context.screen.lateNightImpact.badge}
                </span>
              )}
            </span>
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
      ) : null,
      color: 'text-info',
      interactive: isScreenAvailable,
      onClick: isScreenAvailable ? () => setScreenModalOpen(true) : undefined,
      extra: isScreenAvailable && context.screen.cognitiveProfile && (
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
        {cards.map(({ color, detail, extra, icon: Icon, interactive, label, onClick, value }) => {
          const Tag = interactive ? 'button' : 'article';
          return (
            <Tag
              key={label}
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
        })}
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
