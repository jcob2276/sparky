import { describe, expect, it } from 'vitest';
import {
  DrawingHistory,
  duplicateElements,
  eraseElementsAtPoint,
  eraseStrokePointsAtPoint,
  selectElementsInBounds,
  simplifyStrokePoints,
  transformElements,
  recognizeHeldShape,
  replaceSelectionWithText,
} from '../../../lib/drawing/drawingEngine';
import { createDrawingDocument, type DrawingStroke } from '../../../lib/drawing/drawingModel';

const stroke: DrawingStroke = {
  id: 's1', type: 'stroke', tool: 'pen', color: '#000', width: 4, opacity: 1,
  points: [
    { x: 0, y: 0, pressure: 0.5, tiltX: 0, tiltY: 0, time: 0 },
    { x: 1, y: 0.2, pressure: 0.6, tiltX: 0, tiltY: 0, time: 1 },
    { x: 20, y: 20, pressure: 0.8, tiltX: 0, tiltY: 0, time: 2 },
  ],
};

describe('drawingEngine', () => {
  it('removes redundant points while retaining pressure endpoints', () => {
    const points = simplifyStrokePoints(stroke.points, 2);
    expect(points.map(point => [point.x, point.y])).toEqual([[0, 0], [20, 20]]);
    expect(points[1].pressure).toBe(0.8);
  });

  it('erases a whole vector element hit by the object eraser', () => {
    expect(eraseElementsAtPoint([stroke], { x: 1, y: 1 }, 5)).toEqual([]);
    expect(eraseElementsAtPoint([stroke], { x: 80, y: 80 }, 5)).toEqual([stroke]);
  });

  it('splits a stroke around the point eraser instead of flattening it', () => {
    const longStroke: DrawingStroke = { ...stroke, points: [
      { ...stroke.points[0], x: 0 },
      { ...stroke.points[0], x: 10 },
      { ...stroke.points[0], x: 20 },
      { ...stroke.points[0], x: 30 },
      { ...stroke.points[0], x: 40 },
    ] };
    const result = eraseStrokePointsAtPoint([longStroke], { x: 20, y: 0 }, 5, () => 'split');
    expect(result).toHaveLength(2);
    expect(result.every(element => element.type === 'stroke')).toBe(true);
  });

  it('undoes and redoes immutable document snapshots', () => {
    const empty = createDrawingDocument(100, 100);
    const drawn = { ...empty, elements: [stroke] };
    const history = new DrawingHistory(empty);
    history.commit(drawn);
    expect(history.undo().elements).toEqual([]);
    expect(history.redo().elements).toEqual([stroke]);
  });

  it('selects, moves and duplicates vector strokes without flattening them', () => {
    const selected = selectElementsInBounds([stroke], { x: -1, y: -1, width: 25, height: 25 });
    expect(selected).toEqual(['s1']);
    const moved = transformElements([stroke], new Set(selected), { translateX: 10, translateY: 5, scale: 1, rotation: 0 });
    expect(moved[0].type === 'stroke' && moved[0].points[0]).toEqual(expect.objectContaining({ x: 10, y: 5 }));
    const duplicated = duplicateElements(moved, new Set(selected), () => 'copy');
    expect(duplicated.map(element => element.id)).toEqual(['s1', 'copy']);
  });

  it('recognizes a held nearly-straight stroke as an editable line', () => {
    const lineStroke: DrawingStroke = { ...stroke, points: [
      { x: 0, y: 0, pressure: 1, tiltX: 0, tiltY: 0, time: 0 },
      { x: 50, y: 1, pressure: 1, tiltX: 0, tiltY: 0, time: 100 },
      { x: 100, y: 0, pressure: 1, tiltX: 0, tiltY: 0, time: 700 },
    ] };
    expect(recognizeHeldShape(lineStroke)).toEqual(expect.objectContaining({ type: 'shape', shape: 'line', endX: 100 }));
  });

  it('replaces selected handwriting with an editable text element', () => {
    const result = replaceSelectionWithText([stroke], new Set(['s1']), 'Cześć', () => 'text-1');
    expect(result).toEqual([expect.objectContaining({ id: 'text-1', type: 'text', text: 'Cześć' })]);
  });

  it('recognizes a held arrow and a closed triangle', () => {
    const point = (x: number, y: number, time: number) => ({ x, y, time, pressure: 1, tiltX: 0, tiltY: 0 });
    const arrow = recognizeHeldShape({ ...stroke, points: [point(0, 0, 0), point(100, 0, 200), point(80, -15, 350), point(100, 0, 500), point(80, 15, 700)] });
    const triangle = recognizeHeldShape({ ...stroke, points: [point(0, 100, 0), point(50, 0, 200), point(100, 100, 400), point(0, 100, 700)] });
    expect(arrow).toEqual(expect.objectContaining({ shape: 'arrow', endX: 100, endY: 0 }));
    expect(triangle).toEqual(expect.objectContaining({ shape: 'polygon' }));
  });
});
