export const IOS_SPRING = {
  default: { type: 'spring', damping: 28, stiffness: 360, mass: 0.7 },
  interactive: { type: 'spring', damping: 24, stiffness: 380, mass: 0.6 },
  sheet: { type: 'spring', damping: 28, stiffness: 350, mass: 0.6 },
} as const;

export function projectMomentum(velocity: number, decelerationRate = 0.998) {
  if (decelerationRate <= 0 || decelerationRate >= 1) return 0;
  return (velocity / 1_000) * decelerationRate / (1 - decelerationRate);
}

export function nearestSnapPoint(position: number, snapPoints: readonly number[]) {
  if (snapPoints.length === 0) return position;
  return snapPoints.reduce((nearest, point) => (
    Math.abs(point - position) < Math.abs(nearest - position) ? point : nearest
  ));
}

export function rubberBand(overshoot: number, dimension: number, constant = 0.55) {
  if (dimension <= 0 || overshoot === 0) return 0;
  return (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot));
}

interface GestureCommitInput {
  distance: number;
  velocity: number;
  dimension: number;
  distanceRatio?: number;
  velocityThreshold?: number;
}

export function shouldCommitGesture({
  distance,
  velocity,
  dimension,
  distanceRatio = 0.16,
  velocityThreshold = 520,
}: GestureCommitInput) {
  return Math.abs(distance) >= dimension * distanceRatio ||
    Math.abs(velocity) >= velocityThreshold;
}

export function shouldBlockSwipeNav(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  // Explicit opt-outs
  if (target.closest('[data-no-swipe-nav], [data-no-view-swipe], [data-swipeable], [data-slider]')) {
    return true;
  }

  // Interactive form controls & buttons
  if (target.closest('input, textarea, select, button, a, label')) {
    return true;
  }

  // ARIA interactive roles
  if (target.closest('[role="slider"], [role="switch"], [role="tab"], [role="button"], [role="checkbox"], [role="dialog"], [role="menu"]')) {
    return true;
  }

  // Touch-specific or draggable styling / components
  if (target.closest('.touch-none, .touch-pan-x, .cursor-grab, .cursor-grabbing, .keep-swipe-row, [data-testid="swipeable-note-row"]')) {
    return true;
  }

  // Horizontally scrollable containers (carousels, chips, table rows)
  let curr: HTMLElement | null = target;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.scrollWidth > curr.clientWidth + 4) {
      try {
        const overflowX = window.getComputedStyle(curr).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          return true;
        }
      } catch {
        // Ignore style computation errors in non-browser environments
      }
    }
    curr = curr.parentElement;
  }

  return false;
}

