import { useState, useEffect } from 'react';
import { getSprintInfo, SPRINT_SEASON } from '../../lib/growth/sprintUtils';
import { getDailyFuelQuote } from '../../lib/dailyFuelQuotes';
import { useUserId } from '../../store/useStore';
import LightboxGallery from './LightboxGallery';
import HeroThumbnail from './visionHero/HeroThumbnail';
import { useSprintGoal } from './visionHero/useSprintGoal';
import { HERO_IMAGES, HERO_ROTATION_MS, livedDays } from './visionHero/visionHeroData';

/**
 * VisionHeroCard — kompaktowy moduł tożsamościowy: dzień życia, sprint z postępem %,
 * cytat dnia i miniatura Mapy Marzeń / Celu (tap otwiera pełnoekranową galerię).
 */
export default function VisionHeroCard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const userId = useUserId();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, HERO_ROTATION_MS);
    return () => clearInterval(interval);
  }, []);

  const lived = livedDays();
  const sprint = getSprintInfo();
  const fuel = getDailyFuelQuote(lived);
  const sprintGoal = useSprintGoal(userId, sprint.personalYear, sprint.sprintNumber);
  const pct = Math.min(100, Math.max(0, sprint.pct));
  const quoteTitle = fuel.author ? `${fuel.text} — ${fuel.author}` : fuel.text;

  return (
    <>
      <section className="flex items-stretch gap-3 overflow-hidden rounded-3xl border border-border-custom/70 bg-surface-solid/40 p-3 shadow-sm">
        <div
          onClick={() => setIsFullscreen(true)}
          className="flex min-w-0 flex-1 cursor-pointer select-none flex-col justify-center gap-1.5"
        >
          <p title={`${SPRINT_SEASON[sprint.sprintNumber]} · PY${sprint.personalYear}`} className="truncate text-2xs font-black uppercase tracking-wider text-primary">
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
            <span className="shrink-0 text-xs font-black tabular-nums text-text-primary">{pct}%</span>
          </div>
          {sprintGoal && <p className="truncate text-2xs font-bold text-text-secondary">🎯 {sprintGoal}</p>}
          <p title={quoteTitle} className="line-clamp-2 font-display text-xs font-semibold italic leading-snug text-text-primary">
            „{fuel.text}”
          </p>
        </div>
        <HeroThumbnail
          images={HERO_IMAGES}
          currentIndex={currentImageIndex}
          loaded={imageLoaded}
          onLoaded={() => setImageLoaded(true)}
          onOpen={() => setIsFullscreen(true)}
        />
      </section>

      {isFullscreen && (
        <LightboxGallery
          images={HERO_IMAGES}
          initialIndex={currentImageIndex}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
