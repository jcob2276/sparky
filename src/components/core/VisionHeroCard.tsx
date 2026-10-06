import { useState, useEffect, useRef } from 'react';
import { Maximize2, Sparkles } from 'lucide-react';
import { getSprintInfo, SPRINT_SEASON } from '../../lib/growth/sprintUtils';
import { getDailyFuelQuote } from '../../lib/dailyFuelQuotes';
import { fetchSprintContext } from '../../lib/goal/goalSpine';
import { useGoalSpineInvalidation } from '../../hooks/useGoalSpineInvalidation';
import { useUserId } from '../../store/useStore';
import LightboxGallery from './LightboxGallery';
import dreamBoardLandscape from '../../assets/dream_board_landscape.jpg';
import girlGoal from '../../assets/girl_goal.png';

const BORN = new Date('2002-07-06');

function livedDays(): number {
  return Math.floor((Date.now() - BORN.getTime()) / 86400000);
}

const IMAGES = [
  { src: dreamBoardLandscape, alt: 'Mapa Marzeń — Wizja 6 Filarów', title: 'Wizja · 6 Filarów', objectPosition: 'object-center' },
  { src: girlGoal, alt: 'Cel', title: 'Cel', objectPosition: 'object-[center_25%]' }
];

/**
 * VisionHeroCard — Zunifikowany moduł tożsamościowy łączący Mapę Marzeń (Wizja 6 Filarów)
 * z Memento Mori, celem kwartalnym sprintu i stoickim cytatem dnia w jedną spójną bryłę.
 */
export default function VisionHeroCard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const userId = useUserId();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const lived = livedDays();
  const sprint = getSprintInfo();
  const fuel = getDailyFuelQuote(lived);

  const [sprintGoal, setSprintGoal] = useState<string | null>(null);
  const loadRef = useRef(() => {
    if (userId) void fetchSprintContext(userId).then((ctx) => setSprintGoal(ctx.goalText));
  });

  useEffect(() => {
    loadRef.current = () => {
      if (userId) void fetchSprintContext(userId).then((ctx) => setSprintGoal(ctx.goalText));
    };
    loadRef.current();
  }, [userId, sprint.personalYear, sprint.sprintNumber]);

  useGoalSpineInvalidation(() => loadRef.current());

  return (
    <>
      <section className="rounded-3xl border border-border-custom/70 bg-surface-solid/40 shadow-sm backdrop-blur-xs overflow-hidden transition-all">
        {/* Cover: Mapa Marzeń 16:9 */}
        <div
          onClick={() => setIsFullscreen(true)}
          className="group relative w-full aspect-video max-h-48 sm:max-h-56 overflow-hidden cursor-pointer select-none bg-surface-2 transition-transform active:scale-[0.995]"
        >
          {/* Skeleton placeholder while image loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-2 animate-pulse">
              <Sparkles size={20} className="text-warning/40 animate-spin" />
            </div>
          )}

          {IMAGES.map((img, idx) => (
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              onLoad={() => {
                if (idx === currentImageIndex) setImageLoaded(true);
              }}
              onError={(e) => {
                if (e.currentTarget.src !== '/dream_board_landscape.jpg') {
                  e.currentTarget.src = '/dream_board_landscape.jpg';
                }
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out group-hover:scale-[1.02] ${
                idx === currentImageIndex && imageLoaded ? 'opacity-100 z-10' : 'opacity-0 z-0'
              } ${img.objectPosition || ''}`}
              draggable={false}
            />
          ))}

          {/* Subtelny gradient górny */}
          <div className="absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />

          {/* Badge lewy górny */}
          <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-20">
            <span className="text-3xs font-black uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-warning border border-white/10 shadow-xs transition-opacity duration-300">
              {IMAGES[currentImageIndex].title}
            </span>
          </div>

          {/* Ikona pełnego ekranu prawy górny */}
          <div className="absolute top-2.5 right-3 opacity-80 group-hover:opacity-100 transition-opacity z-20">
            <div className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/90 border border-white/10 shadow-xs">
              <Maximize2 size={12} />
            </div>
          </div>

          {/* Pasek dolny na zdjęciu z hasłem i sezonem */}
          <div className="absolute inset-x-0 bottom-0 py-1.5 px-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between z-20">
            <span className="text-3xs font-black uppercase tracking-widest text-white/95 drop-shadow-xs">
              Built Not Wished
            </span>
            <span className="text-3xs font-bold text-warning drop-shadow-xs">
              {SPRINT_SEASON[sprint.sprintNumber]} · Tydz. {sprint.weekInSprint}/12
            </span>
          </div>
        </div>

        {/* Dolna część: Stoicki cytat dnia + Memento Mori + Postęp Sprintu */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Memento Mori & Pora roku */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-custom/30 text-3xs font-bold">
            <span className="text-2xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
              ⏳ Memento Mori · Dzień {lived.toLocaleString('pl-PL')} życia
            </span>
            <span className="text-text-muted">
              PY{sprint.personalYear} · Sprint {sprint.sprintNumber}
            </span>
          </div>

          {/* Cytat dnia */}
          <div className="pt-0.5">
            <p className="font-display text-sm md:text-base font-semibold italic text-text-primary whitespace-pre-line leading-relaxed">
              „{fuel.text}”
            </p>
            {fuel.author && (
              <p className="mt-1.5 text-2xs font-bold text-text-muted">
                — {fuel.author}
                {fuel.source ? <span className="font-normal italic">, {fuel.source}</span> : null}
              </p>
            )}
          </div>

          {/* Cel sprintu i pasek postępu */}
          <div className="border-t border-border-custom/30 pt-2.5 space-y-2">
            {sprintGoal && (
              <p className="text-xs font-bold text-text-primary leading-snug">
                🎯 {sprintGoal}
              </p>
            )}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/80 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, sprint.pct))}%` }}
                />
              </div>
              <span className="text-3xs font-black tracking-wider text-text-muted shrink-0">
                {sprint.pct}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Pełnego Ekranu */}
      {isFullscreen && (
        <LightboxGallery
          images={IMAGES}
          initialIndex={currentImageIndex}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
