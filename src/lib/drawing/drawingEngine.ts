import type { DrawingDocument, DrawingElement, DrawingPoint, DrawingShape, DrawingStroke } from './drawingModel';

const distance = (a: Pick<DrawingPoint, 'x' | 'y'>, b: Pick<DrawingPoint, 'x' | 'y'>): number => (
  Math.hypot(a.x - b.x, a.y - b.y)
);

export function simplifyStrokePoints(points: DrawingPoint[], minDistance: number): DrawingPoint[] {
  if (points.length <= 2) return points;
  const simplified = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    if (distance(simplified[simplified.length - 1], points[index]) >= minDistance) {
      simplified.push(points[index]);
    }
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

const pointToSegmentDistance = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number => {
  const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (lengthSquared === 0) return distance(point as DrawingPoint, start as DrawingPoint);
  const t = Math.max(0, Math.min(1, (
    (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)
  ) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * (end.x - start.x)), point.y - (start.y + t * (end.y - start.y)));
};

const strokeHit = (stroke: DrawingStroke, point: { x: number; y: number }, radius: number): boolean => (
  stroke.points.some((current, index) => index === 0
    ? distance(current, point as DrawingPoint) <= radius + stroke.width / 2
    : pointToSegmentDistance(point, stroke.points[index - 1], current) <= radius + stroke.width / 2)
);

export function eraseElementsAtPoint(
  elements: DrawingElement[],
  point: { x: number; y: number },
  radius: number,
): DrawingElement[] {
  return elements.filter(element => element.type !== 'stroke' || !strokeHit(element, point, radius));
}

export function eraseStrokePointsAtPoint(
  elements: DrawingElement[],
  point: { x: number; y: number },
  radius: number,
  idFactory: () => string = () => crypto.randomUUID(),
): DrawingElement[] {
  return elements.flatMap(element => {
    if (element.type !== 'stroke' || !strokeHit(element, point, radius)) return [element];
    const segments: DrawingPoint[][] = [];
    let current: DrawingPoint[] = [];
    for (const strokePoint of element.points) {
      if (distance(strokePoint, point as DrawingPoint) <= radius + element.width / 2) {
        if (current.length >= 2) segments.push(current);
        current = [];
      } else {
        current.push(strokePoint);
      }
    }
    if (current.length >= 2) segments.push(current);
    return segments.map(points => ({ ...element, id: idFactory(), points }));
  });
}

export interface DrawingBounds { x: number; y: number; width: number; height: number }
export interface DrawingTransform {
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
}

const elementPoints = (element: DrawingElement): Array<{ x: number; y: number }> => {
  if (element.type === 'stroke') return element.points;
  if (element.type === 'shape') return [{ x: element.x, y: element.y }, { x: element.endX, y: element.endY }];
  return [{ x: element.x, y: element.y }];
};

export function getElementsBounds(elements: DrawingElement[], selectedIds?: Set<string>): DrawingBounds | null {
  const points = elements.filter(element => !selectedIds || selectedIds.has(element.id)).flatMap(elementPoints);
  if (!points.length) return null;
  const minX = Math.min(...points.map(point => point.x));
  const maxX = Math.max(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));
  const maxY = Math.max(...points.map(point => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function selectElementsInBounds(elements: DrawingElement[], bounds: DrawingBounds): string[] {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  return elements.filter(element => elementPoints(element).some(point => (
    point.x >= bounds.x && point.x <= right && point.y >= bounds.y && point.y <= bottom
  ))).map(element => element.id);
}

const transformPoint = (
  point: { x: number; y: number },
  center: { x: number; y: number },
  transform: DrawingTransform,
) => {
  const scaledX = (point.x - center.x) * transform.scale;
  const scaledY = (point.y - center.y) * transform.scale;
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: center.x + scaledX * cos - scaledY * sin + transform.translateX,
    y: center.y + scaledX * sin + scaledY * cos + transform.translateY,
  };
};

export function transformElements(
  elements: DrawingElement[],
  selectedIds: Set<string>,
  transform: DrawingTransform,
): DrawingElement[] {
  const selectedPoints = elements.filter(element => selectedIds.has(element.id)).flatMap(elementPoints);
  if (!selectedPoints.length) return elements;
  const center = {
    x: (Math.min(...selectedPoints.map(point => point.x)) + Math.max(...selectedPoints.map(point => point.x))) / 2,
    y: (Math.min(...selectedPoints.map(point => point.y)) + Math.max(...selectedPoints.map(point => point.y))) / 2,
  };
  return elements.map(element => {
    if (!selectedIds.has(element.id)) return element;
    if (element.type === 'stroke') return {
      ...element,
      points: element.points.map(point => ({ ...point, ...transformPoint(point, center, transform) })),
    };
    if (element.type === 'shape') return {
      ...element,
      ...transformPoint(element, center, transform),
      ...Object.fromEntries(Object.entries(transformPoint({ x: element.endX, y: element.endY }, center, transform)).map(([key, value]) => [key === 'x' ? 'endX' : 'endY', value])),
    };
    return { ...element, ...transformPoint(element, center, transform), fontSize: element.fontSize * transform.scale };
  });
}

export function duplicateElements(
  elements: DrawingElement[],
  selectedIds: Set<string>,
  idFactory: () => string = () => crypto.randomUUID(),
): DrawingElement[] {
  const copies = elements.filter(element => selectedIds.has(element.id)).map(element => {
    const id = idFactory();
    const [copy] = transformElements([{ ...element, id }], new Set([id]), {
      translateX: 20, translateY: 20, scale: 1, rotation: 0,
    });
    return copy;
  });
  return [...elements, ...copies];
}

export function replaceSelectionWithText(
  elements: DrawingElement[],
  selectedIds: Set<string>,
  text: string,
  idFactory: () => string = () => crypto.randomUUID(),
): DrawingElement[] {
  const bounds = getElementsBounds(elements, selectedIds);
  if (!bounds || !text.trim()) return elements;
  const firstSelected = elements.find(element => selectedIds.has(element.id));
  return [
    ...elements.filter(element => !selectedIds.has(element.id)),
    {
      id: idFactory(), type: 'text', text: text.trim(), color: '#111111',
      fontSize: Math.max(18, Math.min(48, bounds.height || 24)), x: bounds.x, y: bounds.y + Math.max(18, bounds.height),
      layerId: firstSelected?.layerId,
    },
  ];
}

export function recognizeHeldShape(stroke: DrawingStroke): DrawingShape | null {
  if (stroke.points.length < 2) return null;
  const first = stroke.points[0];
  const last = stroke.points[stroke.points.length - 1];
  if (last.time - first.time < 500) return null;
  const bounds = getElementsBounds([stroke]);
  if (!bounds) return null;
  const closed = distance(first, last) <= Math.max(18, stroke.width * 4);
  if (closed && bounds.width > 20 && bounds.height > 20) {
    const edgeTolerance = Math.max(8, Math.min(bounds.width, bounds.height) * 0.12);
    const edgePoints = stroke.points.filter(point => (
      Math.abs(point.x - bounds.x) <= edgeTolerance
      || Math.abs(point.x - (bounds.x + bounds.width)) <= edgeTolerance
      || Math.abs(point.y - bounds.y) <= edgeTolerance
      || Math.abs(point.y - (bounds.y + bounds.height)) <= edgeTolerance
    )).length;
    const polygonPoints = simplifyStrokePoints(stroke.points, Math.max(8, Math.min(bounds.width, bounds.height) * 0.12))
      .filter((point, index, points) => index !== points.length - 1 || distance(point, points[0]) > Math.max(18, stroke.width * 4));
    const isRectangle = edgePoints / stroke.points.length > 0.72 && polygonPoints.length === 4;
    const isPolygon = polygonPoints.length >= 3 && polygonPoints.length <= 8 && !isRectangle;
    return {
      id: stroke.id,
      type: 'shape',
      shape: isPolygon ? 'polygon' : isRectangle ? 'rectangle' : 'ellipse',
      color: stroke.color,
      width: stroke.width,
      opacity: stroke.opacity,
      x: bounds.x,
      y: bounds.y,
      endX: bounds.x + bounds.width,
      endY: bounds.y + bounds.height,
      ...(isPolygon ? { points: polygonPoints.map(point => ({ x: point.x, y: point.y })) } : {}),
    };
  }
  const distancesFromStart = stroke.points.map(point => distance(first, point));
  const shaftLength = Math.max(...distancesFromStart);
  const tipIndex = distancesFromStart.indexOf(shaftLength);
  const tip = stroke.points[tipIndex];
  const afterTip = stroke.points.slice(tipIndex + 1);
  const headTolerance = Math.max(12, shaftLength * 0.12);
  const hasTipReturn = afterTip.some(point => distance(point, tip) <= headTolerance);
  const headEnds = afterTip.filter(point => {
    const headDistance = distance(point, tip);
    return headDistance > headTolerance && headDistance < shaftLength * 0.45;
  });
  if (tipIndex > 0 && tipIndex < stroke.points.length - 2 && hasTipReturn && headEnds.length >= 2) {
    return {
      id: stroke.id, type: 'shape', shape: 'arrow', color: stroke.color, width: stroke.width,
      opacity: stroke.opacity, x: first.x, y: first.y, endX: tip.x, endY: tip.y,
    };
  }
  const maximumDeviation = Math.max(...stroke.points.map(point => (
    pointToSegmentDistance(point, first, last)
  )));
  if (maximumDeviation > Math.max(5, stroke.width * 1.5)) return null;
  return {
    id: stroke.id,
    type: 'shape',
    shape: 'line',
    color: stroke.color,
    width: stroke.width,
    opacity: stroke.opacity,
    x: first.x,
    y: first.y,
    endX: last.x,
    endY: last.y,
  };
}

export class DrawingHistory {
  private past: DrawingDocument[] = [];
  private future: DrawingDocument[] = [];
  private current: DrawingDocument;

  constructor(initial: DrawingDocument) {
    this.current = initial;
  }

  commit(document: DrawingDocument): DrawingDocument {
    this.past.push(this.current);
    if (this.past.length > 100) this.past.shift();
    this.current = document;
    this.future = [];
    return this.current;
  }

  undo(): DrawingDocument {
    const previous = this.past.pop();
    if (!previous) return this.current;
    this.future.push(this.current);
    this.current = previous;
    return this.current;
  }

  redo(): DrawingDocument {
    const next = this.future.pop();
    if (!next) return this.current;
    this.past.push(this.current);
    this.current = next;
    return this.current;
  }
}
