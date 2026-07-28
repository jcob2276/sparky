import { buildMovementTimeline } from '../../../lib/biometrics/ouraMovementTimeline';

export function SleepMovementRow({ movementItems }: { movementItems?: string | null }) {
  const timeline = buildMovementTimeline(movementItems);

  return (
    <div className="border-y border-white/5 py-5">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-text-secondary">Ruch</p>
      {timeline.status === 'available' && timeline.samples.length > 0 ? (
        <div
          aria-label={`Zmierzony ruch: ${timeline.samples.length} zdarzenia`}
          className="relative mt-4 h-12 border-b border-white/10"
        >
          {timeline.samples.map((sample) => (
            <span
              key={sample.index}
              className="absolute bottom-0 w-px rounded-full bg-text-secondary"
              style={{
                height: `${Math.min(32, 7 + sample.intensity * 6)}px`,
                left: `${sample.index / Math.max(1, timeline.totalSamples - 1) * 100}%`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-center text-xs text-text-muted">
          {timeline.status === 'available'
            ? 'Brak wykrytego ruchu'
            : 'Brak danych o ruchu dla tej nocy'}
        </div>
      )}
    </div>
  );
}
