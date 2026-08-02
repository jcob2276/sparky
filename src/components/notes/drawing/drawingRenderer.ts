import type { DrawingDocument, DrawingElement, DrawingStroke } from '../../../lib/drawing/drawingModel';

const renderStroke = (context: CanvasRenderingContext2D, stroke: DrawingStroke) => {
  if (!stroke.points.length) return;
  context.save();
  context.strokeStyle = stroke.color;
  context.globalAlpha = stroke.tool === 'highlighter' ? Math.min(stroke.opacity, 0.35) : stroke.opacity;
  context.lineCap = stroke.tool === 'marker' || stroke.tool === 'highlighter' ? 'square' : 'round';
  context.lineJoin = 'round';
  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const point = stroke.points[index];
    const pressure = stroke.tool === 'pencil' || stroke.tool === 'fountain'
      ? Math.max(0.15, (previous.pressure + point.pressure) / 2)
      : 1;
    context.lineWidth = stroke.width * pressure;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  }
  if (stroke.points.length === 1) {
    context.fillStyle = stroke.color;
    context.globalAlpha = stroke.opacity;
    context.beginPath();
    context.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
};

const renderElement = (context: CanvasRenderingContext2D, element: DrawingElement) => {
  if (element.type === 'stroke') return renderStroke(context, element);
  context.save();
  context.globalAlpha = element.type === 'shape' ? element.opacity : 1;
  context.strokeStyle = element.color;
  context.fillStyle = element.color;
  if (element.type === 'text') {
    context.font = `${element.fontSize}px -apple-system, sans-serif`;
    context.fillText(element.text, element.x, element.y);
  } else {
    context.lineWidth = element.width;
    const width = element.endX - element.x;
    const height = element.endY - element.y;
    context.beginPath();
    if (element.shape === 'ellipse') {
      context.ellipse(element.x + width / 2, element.y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
    } else if (element.shape === 'rectangle') {
      context.rect(element.x, element.y, width, height);
    } else if (element.shape === 'polygon' && element.points?.length) {
      context.moveTo(element.points[0].x, element.points[0].y);
      element.points.slice(1).forEach(point => context.lineTo(point.x, point.y));
      context.closePath();
    } else {
      context.moveTo(element.x, element.y);
      context.lineTo(element.endX, element.endY);
      if (element.shape === 'arrow') {
        const angle = Math.atan2(element.endY - element.y, element.endX - element.x);
        const head = Math.max(14, element.width * 4);
        context.moveTo(element.endX, element.endY);
        context.lineTo(element.endX - head * Math.cos(angle - Math.PI / 6), element.endY - head * Math.sin(angle - Math.PI / 6));
        context.moveTo(element.endX, element.endY);
        context.lineTo(element.endX - head * Math.cos(angle + Math.PI / 6), element.endY - head * Math.sin(angle + Math.PI / 6));
      }
    }
    context.stroke();
  }
  context.restore();
};

export function renderDrawing(
  canvas: HTMLCanvasElement,
  drawingDocument: DrawingDocument,
  cssWidth = canvas.clientWidth || drawingDocument.width,
): void {
  const ratio = window.devicePixelRatio || 1;
  const cssHeight = cssWidth * drawingDocument.height / drawingDocument.width;
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  canvas.style.height = `${cssHeight}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  const scale = cssWidth / drawingDocument.width;
  context.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
  context.fillStyle = drawingDocument.background;
  context.fillRect(0, 0, drawingDocument.width, drawingDocument.height);
  const visibleLayerIds = new Set(drawingDocument.layers.filter(layer => layer.visible).map(layer => layer.id));
  drawingDocument.elements
    .filter(element => visibleLayerIds.has(element.layerId ?? 'default'))
    .forEach(element => renderElement(context, element));
}

export const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Nie udało się utworzyć podglądu PNG.')), 'image/png');
});

export const canvasRegionToPng = (
  canvas: HTMLCanvasElement,
  drawingDocument: DrawingDocument,
  bounds: { x: number; y: number; width: number; height: number },
): Promise<Blob> => {
  const scaleX = canvas.width / drawingDocument.width;
  const scaleY = canvas.height / drawingDocument.height;
  const padding = 16;
  const sourceX = Math.max(0, (bounds.x - padding) * scaleX);
  const sourceY = Math.max(0, (bounds.y - padding) * scaleY);
  const sourceWidth = Math.min(canvas.width - sourceX, (bounds.width + padding * 2) * scaleX);
  const sourceHeight = Math.min(canvas.height - sourceY, (bounds.height + padding * 2) * scaleY);
  const cropped = window.document.createElement('canvas');
  cropped.width = Math.max(1, Math.ceil(sourceWidth));
  cropped.height = Math.max(1, Math.ceil(sourceHeight));
  cropped.getContext('2d')?.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, cropped.width, cropped.height);
  return canvasToPng(cropped);
};
