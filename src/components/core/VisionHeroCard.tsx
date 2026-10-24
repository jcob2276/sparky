import { useState } from 'react';
import { getSprintInfo, SPRINT_SEASON } from '../../lib/growth/sprintUtils';
import { getDailyFuelQuote } from '../../lib/dailyFuelQuotes';
import { useUserId } from '../../store/useStore';
import LightboxGallery from './LightboxGallery';
import { useSprintGoal } from './visionHero/useSprintGoal';
import { HERO_IMAGES, livedDays } from './visionHero/visionHeroData';

/**
 * VisionHeroCard — kompaktowy moduł tożsamościowy: dzień życia, sprint z postępem %,
 * cytat dnia. Tap otwiera galerię Mapy Marzeń (zdjęcia „po co” żyją w rzędzie pod kartami celów).
 */
export default function VisionHeroCard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const userId = useUserId();

  const lived = livedDays();
  const sprint = getSprintInfo();
  const fuel = getDailyFuelQuote(lived);
  const sprintGoal = useSprintGoal(userId, sprint.personalYear, sprint.sprintNumber);
  const pct = Math.min(100, Math.max(0, sprint.pct));

  return (
    <>
      <section className="overflow-hidden ui-surface-lift rounded-[var(--radius-grouped)] border border-border-custom/60 bg-surface-solid/40 p-4">
        <div
          onClick={() => setIsFullscreen(true)}
          className="flex min-h-11 min-w-0 cursor-pointer select-none flex-col gap-2"
        >
          <p title={`${SPRINT_SEASON[sprint.sprintNumber]} · PY${sprint.personalYear}`} className="truncate text-xs font-medium text-text-secondary">
            Dzień {lived.toLocaleString('pl-PL')} · Sprint {sprint.sprintNumber} · tydz. {sprint.weekInSprint}/12
          </p>
          <div
            className="flex items-center gap-2"
            role="progressbar"
            aria-label="Postęp sprintu"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="ui-num shrink-0 text-xs font-semibold tabular-nums text-text-primary">{pct}%</span>
          </div>
          {sprintGoal && <p className="text-xs font-medium leading-snug text-text-primary">{sprintGoal}</p>}
          <p className="text-xs italic leading-snug text-text-muted">
            „{fuel.text}”{fuel.author && <span className="not-italic"> — {fuel.author}</span>}
          </p>
        </div>
      </section>

      {isFullscreen && (
        <LightboxGallery
          images={HERO_IMAGES}
          initialIndex={0}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
