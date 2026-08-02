type MovementTimelineStatus = 'available' | 'unavailable' | 'invalid';

interface MovementSample {
  index: number;
  intensity: number;
}

export interface MovementTimeline {
  status: MovementTimelineStatus;
  samples: MovementSample[];
  totalSamples: number;
}

export function buildMovementTimeline(raw: string | null | undefined): MovementTimeline {
  if (!raw) return { status: 'unavailable', samples: [], totalSamples: 0 };
  if (!/^\d+$/.test(raw)) return { status: 'invalid', samples: [], totalSamples: 0 };

  const samples = [...raw].flatMap((value, index) => {
    const intensity = Number(value);
    return intensity > 0 ? [{ index, intensity }] : [];
  });

  return {
    status: 'available',
    samples,
    totalSamples: raw.length,
  };
}
