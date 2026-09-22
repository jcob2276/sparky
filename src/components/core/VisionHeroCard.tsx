import { useState, useEffect, useRef } from 'react';
import { Maximize2, X, Sparkles } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { getSprintInfo, SPRINT_SEASON } from '../../lib/growth/sprintUtils';
import { getDailyFuelQuote } from '../../lib/dailyFuelQuotes';
import { fetchSprintContext } from '../../lib/goal/goalSpine';
import { useGoalSpineInvalidation } from '../../hooks/useGoalSpineInvalidation';
import { useUserId } from '../../store/useStore';
import dreamBoardLandscape from '../../assets/dream_board_landscape.jpg';

const BORN = new Date('2002-07-06');

function livedDays(): number {
  return Math.floor((Date.now() - BORN.getTime()) / 86400000);
}

/**
 * VisionHeroCard — Zunifikowany moduł tożsamościowy łączący Mapę Marzeń (Wizja 6 Filarów)
 * z Memento Mori, celem kwartalnym sprintu i stoickim cytatem dnia w jedną spójną bryłę.
 */
export default function VisionHeroCard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(dreamBoardLandscape);
  const userId = useUserId();

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

          <img
            src={imageSrc}
            alt="Mapa Marzeń — Wizja 6 Filarów"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              // Fallback to public path if bundler asset fails
              if (imageSrc !== '/dream_board_landscape.jpg') {
                setImageSrc('/dream_board_landscape.jpg');
              }
            }}
            className={`w-full h-full object-cover transition-all group-hover:scale-[1.02] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            draggable={false}
          />

          {/* Subtelny gradient górny */}
          <div className="absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />

          {/* Badge lewy górny */}
          <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
            <span className="text-3xs font-black uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-warning border border-white/10 shadow-xs">
              Wizja · 6 Filarów
            </span>
          </div>

          {/* Ikona pełnego ekranu prawy górny */}
          <div className="absolute top-2.5 right-3 opacity-80 group-hover:opacity-100 transition-opacity">
            <div className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/90 border border-white/10 shadow-xs">
              <Maximize2 size={12} />
            </div>
          </div>

          {/* Pasek dolny na zdjęciu z hasłem i sezonem */}
          <div className="absolute inset-x-0 bottom-0 py-1.5 px-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between">
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
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-3 backdrop-blur-md animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-11 right-0 flex items-center gap-2">
              <Pressable
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 text-white cursor-pointer"
                icon={<X size={16} />}
              />
            </div>
            <img
              src={imageSrc}
              alt="Pełna Mapa Marzeń"
              className="w-full h-auto rounded-2xl border border-white/15 shadow-2xl"
            />
            <p className="mt-3 text-center text-xs font-semibold text-white/60 tracking-wider uppercase">
              Dotknij gdziekolwiek aby zamknąć
            </p>
          </div>
        </div>
      )}
    </>
  );
}
