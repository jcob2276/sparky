import { describe, expect, it } from 'vitest';
import {
  createDrawingDocument,
  parseDrawingDocument,
  type DrawingStroke,
} from '../../../lib/drawing/drawingModel';

describe('drawingModel', () => {
  it('creates a versioned editable document', () => {
    const document = createDrawingDocument(1200, 1600);
    expect(document).toEqual(expect.objectContaining({
      schemaVersion: 1,
      width: 1200,
      height: 1600,
      elements: [],
      layers: [{ id: 'default', name: 'Warstwa 1', visible: true, locked: false }],
      activeLayerId: 'default',
    }));
  });

  it('migrates a legacy document to a default editable layer', () => {
    const legacy = { ...createDrawingDocument(100, 100) } as Record<string, unknown>;
    delete legacy.layers;
    delete legacy.activeLayerId;
    const parsed = parseDrawingDocument(legacy);
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.activeLayerId).toBe('default');
  });

  it('parses a complete pressure-sensitive stroke', () => {
    const stroke: DrawingStroke = {
      id: 's1',
      type: 'stroke',
      tool: 'pen',
      color: '#000000',
      width: 4,
      opacity: 1,
      points: [{ x: 10, y: 20, pressure: 0.7, tiltX: 12, tiltY: 3, time: 1 }],
    };
    const parsed = parseDrawingDocument({ ...createDrawingDocument(100, 100), elements: [stroke] });
    expect(parsed.elements[0]).toEqual(stroke);
  });

  it('rejects a future schema instead of corrupting it', () => {
    expect(() => parseDrawingDocument({ schemaVersion: 2 })).toThrow(
      'Nieobsługiwana wersja rysunku.',
    );
  });
});
