import { useCallback, useRef } from 'react';
import { rubberBand, shouldBlockSwipeNav, shouldCommitGesture } from '../../../lib/motion/iosMotion';

interface UseDashboardSwipeNavProps {
  view: string;
  navigateTo: (newView: string) => void;
  tabOrder: string[];
}

export function useDashboardSwipeNav({
  view,
  navigateTo,
  tabOrder,
}: UseDashboardSwipeNavProps) {
  const swipeStart = useRef<{
    x: number;
    y: number;
    t: number;
    lastX: number;
    lastT: number;
    target: EventTarget | null;
    blocksNavigation: boolean;
    axis?: 'x' | 'y';
  } | null>(null);

  const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    swipeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
      lastX: touch.clientX,
      lastT: Date.now(),
      target: e.target,
      blocksNavigation: false,
    };
  }, []);

  const handleMainTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const start = swipeStart.current;
    const touch = e.touches[0];
    if (!start || !touch || start.blocksNavigation) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (!start.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 16) {
      const isX = Math.abs(deltaX) > Math.abs(deltaY) * 1.75;
      start.axis = isX ? 'x' : 'y';
      if (isX && shouldBlockSwipeNav(start.target)) {
        start.blocksNavigation = true;
        return;
      }
    }
    if (start.axis !== 'x') return;

    const index = tabOrder.indexOf(view);
    if (index === -1) return;
    const beyondEdge = (index === 0 && deltaX > 0) ||
      (index === tabOrder.length - 1 && deltaX < 0);
    const offset = beyondEdge ? rubberBand(deltaX, e.currentTarget.clientWidth) : deltaX;
    e.currentTarget.style.transform = `translate3d(${offset}px, 0, 0)`;
    e.currentTarget.style.transition = 'none';
    start.lastX = touch.clientX;
    start.lastT = Date.now();
  }, [tabOrder, view]);

  const handleMainTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.blocksNavigation || start.axis !== 'x') return;

    const touch = e.changedTouches[0];
    const element = e.currentTarget as HTMLElement;

    const cleanupStyles = () => {
      element.style.transition = '';
      element.style.transform = '';
    };

    if (!touch) {
      cleanupStyles();
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const deltaT = Date.now() - start.t;
    const velocitySampleTime = Math.max(1, Date.now() - start.lastT);
    const velocityX = ((touch.clientX - start.lastX) / velocitySampleTime) * 1_000;

    const isHorizontalEnough = Math.abs(deltaX) > Math.abs(deltaY) * 1.75;
    const isFastEnough = deltaT < 650;
    const commits = shouldCommitGesture({
      distance: deltaX,
      velocity: velocityX,
      dimension: element.clientWidth || window.innerWidth,
      distanceRatio: 0.25,
      velocityThreshold: 550,
    });

    if (!isHorizontalEnough || !commits || !isFastEnough) {
      element.style.transition = 'transform var(--motion-medium) var(--ease-out)';
      element.style.transform = 'translate3d(0, 0, 0)';
      window.setTimeout(cleanupStyles, 250);
      return;
    }

    const idx = tabOrder.indexOf(view);
    if (idx === -1) {
      cleanupStyles();
      return;
    }
    const nextIdx = deltaX < 0 ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= tabOrder.length) {
      element.style.transition = 'transform var(--motion-medium) var(--ease-out)';
      element.style.transform = 'translate3d(0, 0, 0)';
      window.setTimeout(cleanupStyles, 250);
      return;
    }

    cleanupStyles();
    navigateTo(tabOrder[nextIdx]);
  }, [view, navigateTo, tabOrder]);

  const handleMainTouchCancel = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start?.axis === 'x') {
      e.currentTarget.style.transition = '';
      e.currentTarget.style.transform = '';
    }
  }, []);

  return {
    handleMainTouchStart,
    handleMainTouchMove,
    handleMainTouchEnd,
    handleMainTouchCancel,
  };
}
