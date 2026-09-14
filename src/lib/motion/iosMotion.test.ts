import { describe, expect, it } from 'vitest';
import {
  nearestSnapPoint,
  projectMomentum,
  rubberBand,
  shouldBlockSwipeNav,
  shouldCommitGesture,
} from './iosMotion';

describe('iOS motion primitives', () => {
  it('projects a release velocity using exponential deceleration', () => {
    expect(projectMomentum(1_000, 0.99)).toBeCloseTo(99, 5);
    expect(projectMomentum(-1_000, 0.99)).toBeCloseTo(-99, 5);
  });

  it('chooses the snap point nearest the projected endpoint', () => {
    expect(nearestSnapPoint(620, [0, 400, 800])).toBe(800);
    expect(nearestSnapPoint(490, [0, 400, 800])).toBe(400);
  });

  it('adds progressively less movement beyond a boundary', () => {
    expect(rubberBand(0, 800)).toBe(0);
    expect(rubberBand(100, 800)).toBeGreaterThan(0);
    expect(rubberBand(200, 800)).toBeLessThan(rubberBand(100, 800) * 2);
    expect(rubberBand(-100, 800)).toBeLessThan(0);
  });

  it('commits a gesture from either sufficient distance or velocity', () => {
    expect(shouldCommitGesture({ distance: 80, velocity: 50, dimension: 390 })).toBe(true);
    expect(shouldCommitGesture({ distance: 10, velocity: 700, dimension: 390 })).toBe(true);
    expect(shouldCommitGesture({ distance: 10, velocity: 50, dimension: 390 })).toBe(false);
  });

  it('identifies elements that must block swipe navigation', () => {
    expect(shouldBlockSwipeNav(null)).toBe(false);

    const button = document.createElement('button');
    expect(shouldBlockSwipeNav(button)).toBe(true);

    const input = document.createElement('input');
    expect(shouldBlockSwipeNav(input)).toBe(true);

    const slider = document.createElement('div');
    slider.setAttribute('role', 'slider');
    expect(shouldBlockSwipeNav(slider)).toBe(true);

    const swipeableRow = document.createElement('div');
    swipeableRow.setAttribute('data-no-swipe-nav', 'true');
    const child = document.createElement('span');
    swipeableRow.appendChild(child);
    expect(shouldBlockSwipeNav(child)).toBe(true);

    const plainDiv = document.createElement('div');
    expect(shouldBlockSwipeNav(plainDiv)).toBe(false);
  });
});
