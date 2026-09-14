import { createPortal } from 'react-dom';
import type { DayMatrixDetail, MatrixLayerId } from './multiDomainMatrixTypes';
import { MATRIX_LAYERS } from './useMultiDomainMatrixData';

interface Props {
  day: DayMatrixDetail;
  rect: DOMRect;
  selectedLayers: Set<MatrixLayerId>;
}

function TooltipWorkoutSection({ day }: { day: DayMatrixDetail }) {
  if (!day.gym && !day.run) return null;
  return (
    <div className="space-y-1 bg-surface/50 rounded-lg p-2 border border-border-custom/30">
      {day.gym && (
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-primary">
            🏋️ {day.gym.name || 'Siłownia'}
          </span>
          <span className="font-mono text-primary font-bold">
            {day.gym.vol > 0 ? `${(day.gym.vol / 1000).toFixed(1)} Mg` : 'Wellness'}
            {day.gym.rpe ? ` · RPE ${day.gym.rpe}` : ''}
          </span>
        </div>
      )}
      {day.gym?.exercises && day.gym.exercises.length > 0 && (
        <p className="text-3xs text-text-muted truncate">
          {day.gym.exercises.join(' · ')}
        </p>
      )}
      {day.run && (
        <div className="flex items-center justify-between pt-0.5">
          <span className="font-semibold text-warning">🏃 Bieg Strava</span>
          <span className="font-mono text-warning font-bold">
            {day.run.km.toFixed(1)} km
          </span>
        </div>
      )}
    </div>
  );
}

function TooltipMacroSleepSection({ day }: { day: DayMatrixDetail }) {
  const hasNutr = day.nutrition && (day.nutrition.kcal != null || day.nutrition.protein != null || day.nutrition.carbs != null);
  const hasSleep = day.sleep && (day.sleep.score != null || day.sleep.hours != null || day.sleep.readiness != null);

  return (
    <>
      {hasNutr && (
        <div className="flex items-center justify-between bg-surface/50 rounded-lg p-2 border border-border-custom/30 font-mono text-2xs">
          <div>
            <span className="text-text-muted block text-3xs font-sans">Kcal</span>
            <span className="font-bold text-text-primary">{day.nutrition?.kcal ?? '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block text-3xs font-sans">Białko</span>
            <span className={`font-bold ${day.nutrition?.protein && day.nutrition.protein >= 140 ? 'text-success' : 'text-text-primary'}`}>
              {day.nutrition?.protein ? `${day.nutrition.protein}g` : '—'}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-3xs font-sans">Węgle</span>
            <span className={`font-bold ${day.nutrition?.carbs && day.nutrition.carbs >= 200 ? 'text-warning' : 'text-text-primary'}`}>
              {day.nutrition?.carbs ? `${day.nutrition.carbs}g` : '—'}
            </span>
          </div>
        </div>
      )}

      {hasSleep && (
        <div className="flex items-center justify-between bg-surface/50 rounded-lg p-2 border border-border-custom/30 font-mono text-2xs">
          <div>
            <span className="text-text-muted block text-3xs font-sans">Sen</span>
            <span className={`font-bold ${day.sleep?.score && day.sleep.score >= 80 ? 'text-info' : 'text-text-primary'}`}>
              {day.sleep?.score ? `${day.sleep.score}/100` : '—'}
              {day.sleep?.hours ? ` (${day.sleep.hours}h)` : ''}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-3xs font-sans">HRV</span>
            <span className="font-bold text-primary">{day.sleep?.hrv ? `${day.sleep.hrv}ms` : '—'}</span>
          </div>
          <div>
            <span className="text-text-muted block text-3xs font-sans">Readiness</span>
            <span className="font-bold text-primary">{day.sleep?.readiness ?? '—'}</span>
          </div>
        </div>
      )}
    </>
  );
}

function TooltipPowerLenieSection({ day }: { day: DayMatrixDetail }) {
  return (
    <>
      {day.powerList.total > 0 && (
        <div className="bg-surface/50 rounded-lg p-2 border border-border-custom/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary">⚡ Power List</span>
            <span className="font-mono font-bold text-primary">
              {day.powerList.done}/{day.powerList.total}
            </span>
          </div>
          <div className="space-y-0.5 pt-0.5">
            {day.powerList.tasks.map((t, idx) => (
              <div key={idx} className="flex items-center gap-1 text-3xs truncate">
                <span className={t.done ? 'text-success' : 'text-text-muted'}>
                  {t.done ? '✓' : '○'}
                </span>
                <span className={t.done ? 'line-through text-text-muted truncate' : 'text-text-secondary truncate'}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {day.lenie.count > 0 ? (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-2 space-y-0.5">
          <div className="flex items-center justify-between text-danger font-bold">
            <span>🚫 Incydent (Lenie)</span>
            <span>{day.lenie.count}×</span>
          </div>
          {day.lenie.stimuli.length > 0 && (
            <p className="text-3xs text-danger/80 truncate">
              Bodziec: {day.lenie.stimuli.join(', ')}
            </p>
          )}
          {day.lenie.notes.length > 0 && (
            <p className="text-3xs text-text-muted italic truncate">
              "{day.lenie.notes[0]}"
            </p>
          )}
        </div>
      ) : (
        !day.isFuture && (
          <div className="flex items-center justify-between px-2 py-1 bg-success/10 rounded text-3xs text-success font-semibold">
            <span>Lenie / relaps:</span>
            <span>Czysto ✅</span>
          </div>
        )
      )}

      {day.habits.totalCount > 0 && (
        <div className="flex items-center justify-between px-2 py-1 bg-accent/10 rounded text-3xs text-accent">
          <span>🧘 Nawyki:</span>
          <span className="font-mono font-bold">
            {day.habits.doneCount}/{day.habits.totalCount} ({Math.round((day.habits.doneCount / day.habits.totalCount) * 100)}%)
          </span>
        </div>
      )}
    </>
  );
}

export function MultiDomainMatrixTooltip({ day, rect, selectedLayers }: Props) {
  const activeMatchedLayers = MATRIX_LAYERS.filter(
    l => selectedLayers.has(l.id) && day.activeLayers.includes(l.id)
  );

  const left = Math.min(rect.right + 12, window.innerWidth - 300);
  const top = Math.max(12, Math.min(rect.top - 40, window.innerHeight - 380));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="w-72 rounded-xl border border-border-custom bg-surface-solid/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-2.5 animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between border-b border-border-custom/50 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-2xs font-bold text-text-muted">{day.date}</span>
          <span className="text-2xs font-black uppercase text-primary">({day.dayOfWeek})</span>
        </div>
        {day.isToday && (
          <span className="rounded bg-primary/20 text-primary px-1.5 py-0.5 text-3xs font-black uppercase">
            Dzisiaj
          </span>
        )}
        {day.isFuture && (
          <span className="text-text-muted text-3xs italic">Przyszłość</span>
        )}
      </div>

      {activeMatchedLayers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeMatchedLayers.map(l => (
            <span
              key={l.id}
              className={`text-3xs font-semibold px-1.5 py-0.5 rounded border ${l.badgeClass}`}
            >
              {l.label}
            </span>
          ))}
        </div>
      )}

      <TooltipWorkoutSection day={day} />
      <TooltipMacroSleepSection day={day} />
      <TooltipPowerLenieSection day={day} />
    </div>,
    document.body
  );
}
