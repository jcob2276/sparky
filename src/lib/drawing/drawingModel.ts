export type DrawingTool = 'pen' | 'pencil' | 'fountain' | 'marker' | 'highlighter';

export interface DrawingPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  time: number;
}

export interface DrawingStroke {
  id: string;
  type: 'stroke';
  tool: DrawingTool;
  color: string;
  width: number;
  opacity: number;
  points: DrawingPoint[];
  layerId?: string;
}

export interface DrawingShape {
  id: string;
  type: 'shape';
  shape: 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'polygon';
  color: string;
  width: number;
  opacity: number;
  x: number;
  y: number;
  endX: number;
  endY: number;
  layerId?: string;
  points?: Array<{ x: number; y: number }>;
}

interface DrawingText {
  id: string;
  type: 'text';
  text: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
  layerId?: string;
}

export type DrawingElement = DrawingStroke | DrawingShape | DrawingText;

interface DrawingViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface DrawingDocument {
  schemaVersion: 1;
  width: number;
  height: number;
  background: string;
  elements: DrawingElement[];
  viewport: DrawingViewport;
  layers: DrawingLayer[];
  activeLayerId: string;
  updatedAt: string;
}

export function createDrawingDocument(width: number, height: number): DrawingDocument {
  return {
    schemaVersion: 1,
    width,
    height,
    background: '#ffffff',
    elements: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    layers: [{ id: 'default', name: 'Warstwa 1', visible: true, locked: false }],
    activeLayerId: 'default',
    updatedAt: new Date().toISOString(),
  };
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const validPoint = (point: unknown): point is DrawingPoint => {
  if (!point || typeof point !== 'object') return false;
  const value = point as Record<string, unknown>;
  return finite(value.x) && finite(value.y) && finite(value.pressure)
    && finite(value.tiltX) && finite(value.tiltY) && finite(value.time);
};

const validElement = (element: unknown): element is DrawingElement => {
  if (!element || typeof element !== 'object') return false;
  const value = element as Record<string, unknown>;
  if (typeof value.id !== 'string' || typeof value.type !== 'string') return false;
  if (value.type === 'stroke') return Array.isArray(value.points) && value.points.every(validPoint)
    && typeof value.tool === 'string' && typeof value.color === 'string'
    && finite(value.width) && finite(value.opacity);
  if (value.type === 'shape') return typeof value.shape === 'string' && typeof value.color === 'string'
    && ['x', 'y', 'endX', 'endY', 'width', 'opacity'].every(key => finite(value[key]))
    && (value.points === undefined || (Array.isArray(value.points) && value.points.every(point => {
      if (!point || typeof point !== 'object') return false;
      const candidate = point as Record<string, unknown>;
      return finite(candidate.x) && finite(candidate.y);
    })));
  if (value.type === 'text') return typeof value.text === 'string' && typeof value.color === 'string'
    && ['x', 'y', 'fontSize'].every(key => finite(value[key]));
  return false;
};

export function parseDrawingDocument(value: unknown): DrawingDocument {
  if (!value || typeof value !== 'object') throw new Error('Uszkodzony dokument rysunku.');
  const document = value as Record<string, unknown>;
  if (document.schemaVersion !== 1) throw new Error('Nieobsługiwana wersja rysunku.');
  if (!finite(document.width) || !finite(document.height) || !Array.isArray(document.elements)
    || !document.elements.every(validElement)) {
    throw new Error('Uszkodzony dokument rysunku.');
  }
  const layers = Array.isArray(document.layers) && document.layers.length
    ? document.layers.filter(layer => {
      if (!layer || typeof layer !== 'object') return false;
      const candidate = layer as Record<string, unknown>;
      return typeof candidate.id === 'string' && typeof candidate.name === 'string'
        && typeof candidate.visible === 'boolean' && typeof candidate.locked === 'boolean';
    }) as DrawingLayer[]
    : [{ id: 'default', name: 'Warstwa 1', visible: true, locked: false }];
  const activeLayerId = typeof document.activeLayerId === 'string'
    && layers.some(layer => layer.id === document.activeLayerId)
    ? document.activeLayerId
    : layers[0].id;
  return { ...(document as unknown as DrawingDocument), layers, activeLayerId };
}
