/* eslint-disable max-lines-per-function -- Pointer capture, coalesced stylus input and pinch state must share refs. */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { eraseElementsAtPoint, eraseStrokePointsAtPoint, getElementsBounds, recognizeHeldShape, selectElementsInBounds, simplifyStrokePoints } from '../../../lib/drawing/drawingEngine';
import type { DrawingDocument, DrawingPoint, DrawingShape, DrawingStroke, DrawingTool } from '../../../lib/drawing/drawingModel';
import { renderDrawing } from './drawingRenderer';
import type { ActiveDrawingTool } from './DrawingToolbar';
import { Capacitor } from '@capacitor/core';
import { StylusInput, type NativeStylusPoint } from '../../../lib/native/stylusInputPlugin';

interface DrawingCanvasProps {
  document: DrawingDocument;
  tool: ActiveDrawingTool;
  color: string;
  width: number;
  opacity: number;
  onCommit: (document: DrawingDocument) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onShapeSuggestion: (shape: DrawingShape) => void;
  ruler: boolean;
  onViewportChange: (viewport: DrawingDocument['viewport']) => void;
}

function DrawingCanvas(props: DrawingCanvasProps, forwardedRef: React.ForwardedRef<HTMLCanvasElement>) {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const strokeRef = useRef<DrawingStroke | null>(null);
  const activePointer = useRef<number | null>(null);
  const lassoStart = useRef<DrawingPoint | null>(null);
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());
  const viewportGesture = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    viewport: DrawingDocument['viewport'];
  } | null>(null);
  const nativeLassoStart = useRef<DrawingPoint | null>(null);
  const activeLayer = props.document.layers.find(layer => layer.id === props.document.activeLayerId);
  const activeElements = props.document.elements.filter(element => (
    (element.layerId ?? 'default') === props.document.activeLayerId
  ));
  const visibleElements = props.document.elements.filter(element => {
    const layer = props.document.layers.find(item => item.id === (element.layerId ?? 'default'));
    return layer?.visible && !layer.locked;
  });
  const replaceActiveElements = (next: DrawingDocument['elements']) => [
    ...props.document.elements.filter(element => (element.layerId ?? 'default') !== props.document.activeLayerId),
    ...next,
  ];

  const beginViewportGesture = () => {
    const points = [...touchPointers.current.values()];
    if (points.length !== 2) return;
    viewportGesture.current = {
      distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
      midpoint: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
      viewport: props.document.viewport,
    };
    strokeRef.current = null;
  };

  const updateViewportGesture = () => {
    const gesture = viewportGesture.current;
    const points = [...touchPointers.current.values()];
    if (!gesture || points.length !== 2) return;
    const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    props.onViewportChange({
      zoom: Math.max(0.5, Math.min(4, gesture.viewport.zoom * distance / Math.max(1, gesture.distance))),
      x: gesture.viewport.x + midpoint.x - gesture.midpoint.x,
      y: gesture.viewport.y + midpoint.y - gesture.midpoint.y,
    });
  };

  const commitStroke = useCallback(() => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const simplified = simplifyStrokePoints(stroke.points, 0.8);
    const finalized = { ...stroke, points: props.ruler && simplified.length > 1
      ? [simplified[0], simplified[simplified.length - 1]]
      : simplified };
    props.onCommit({
      ...props.document,
      elements: [...props.document.elements, finalized],
      updatedAt: new Date().toISOString(),
    });
    const suggestion = recognizeHeldShape(finalized);
    if (suggestion) props.onShapeSuggestion(suggestion);
    strokeRef.current = null;
  }, [props]);

  useImperativeHandle(forwardedRef, () => internalRef.current as HTMLCanvasElement, []);

  useEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    renderDrawing(canvas, props.document, canvas.parentElement?.clientWidth || props.document.width);
    const bounds = getElementsBounds(props.document.elements, props.selectedIds);
    const context = canvas.getContext('2d');
    if (bounds && context) {
      const ratio = window.devicePixelRatio || 1;
      const scale = canvas.clientWidth / props.document.width;
      context.save();
      context.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
      context.strokeStyle = '#0a84ff';
      context.lineWidth = 2 / scale;
      context.setLineDash([8 / scale, 5 / scale]);
      context.strokeRect(bounds.x - 8, bounds.y - 8, bounds.width + 16, bounds.height + 16);
      context.restore();
    }
  }, [props.document, props.selectedIds]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const nativeActiveLayer = props.document.layers.find(layer => layer.id === props.document.activeLayerId);
    const nativeActiveElements = props.document.elements.filter(element => (
      (element.layerId ?? 'default') === props.document.activeLayerId
    ));
    const nativeVisibleElements = props.document.elements.filter(element => {
      const layer = props.document.layers.find(item => item.id === (element.layerId ?? 'default'));
      return layer?.visible && !layer.locked;
    });
    const replaceNativeActiveElements = (next: DrawingDocument['elements']) => [
      ...props.document.elements.filter(element => (element.layerId ?? 'default') !== props.document.activeLayerId),
      ...next,
    ];
    let listener: Awaited<ReturnType<typeof StylusInput.addListener>> | undefined;
    let density = 1;
    let cancelled = false;
    const nativePoint = (point: NativeStylusPoint): DrawingPoint | null => {
      const canvas = internalRef.current;
      if (!canvas) return null;
      const bounds = canvas.getBoundingClientRect();
      const cssX = point.x / density;
      const cssY = point.y / density;
      return {
        x: (cssX - bounds.left) / bounds.width * props.document.width,
        y: (cssY - bounds.top) / bounds.height * props.document.height,
        pressure: point.pressure,
        tiltX: Math.sin(point.orientation) * point.tilt * 90,
        tiltY: Math.cos(point.orientation) * point.tilt * 90,
        time: point.time,
      };
    };
    void StylusInput.start().then(result => {
      density = result.density || 1;
      return StylusInput.addListener('stylusEvent', event => {
        if (cancelled) return;
        const points = event.points.map(nativePoint).filter((point): point is DrawingPoint => !!point);
        if (!points.length) return;
        if (props.tool === 'lasso') {
          if (event.action === 'down') nativeLassoStart.current = points[0];
          if (event.action === 'up' && nativeLassoStart.current) {
            const start = nativeLassoStart.current;
            const end = points.at(-1)!;
            props.onSelectionChange(new Set(selectElementsInBounds(nativeVisibleElements, {
              x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
              width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y),
            })));
            nativeLassoStart.current = null;
          }
          if (event.action === 'cancel') nativeLassoStart.current = null;
          return;
        }
        if (event.eraser || props.tool === 'object-eraser' || props.tool === 'point-eraser') {
          if (nativeActiveLayer?.locked || !nativeActiveLayer?.visible) return;
          props.onCommit({ ...props.document, elements: replaceNativeActiveElements(props.tool === 'point-eraser'
            ? eraseStrokePointsAtPoint(nativeActiveElements, points.at(-1)!, props.width * 2)
            : eraseElementsAtPoint(nativeActiveElements, points.at(-1)!, props.width * 2)) });
          return;
        }
        if (nativeActiveLayer?.locked || !nativeActiveLayer?.visible) return;
        if (event.action === 'down') {
          strokeRef.current = {
            id: crypto.randomUUID(), type: 'stroke', tool: props.tool,
            color: props.color, width: props.width, opacity: props.opacity, points, layerId: props.document.activeLayerId,
          };
        } else if (event.action === 'move' && strokeRef.current) {
          strokeRef.current.points.push(...points);
          const canvas = internalRef.current;
          if (canvas) renderDrawing(canvas, { ...props.document, elements: [...props.document.elements, strokeRef.current] });
        } else if (event.action === 'up') {
          if (strokeRef.current) strokeRef.current.points.push(...points);
          commitStroke();
        } else {
          strokeRef.current = null;
        }
      });
    }).then(handle => { listener = handle; }).catch(() => undefined);
    return () => {
      cancelled = true;
      void listener?.remove();
      void StylusInput.stop().catch(() => undefined);
    };
  }, [commitStroke, props]);

  const pointFromCoordinates = (event: Pick<PointerEvent, 'clientX' | 'clientY' | 'pressure' | 'pointerType' | 'tiltX' | 'tiltY' | 'timeStamp'>, canvas: HTMLCanvasElement): DrawingPoint => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) / bounds.width * props.document.width,
      y: (event.clientY - bounds.top) / bounds.height * props.document.height,
      pressure: event.pressure || (event.pointerType === 'mouse' ? 0.5 : 1),
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      time: event.timeStamp,
    };
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): DrawingPoint => (
    pointFromCoordinates(event.nativeEvent, event.currentTarget)
  );

  return (
    <canvas
      ref={internalRef}
      className="drawing-canvas"
      style={{ transform: `translate3d(${props.document.viewport.x}px, ${props.document.viewport.y}px, 0) scale(${props.document.viewport.zoom})` }}
      aria-label="Płótno rysunku"
      onPointerDown={event => {
        if (event.pointerType === 'touch') {
          touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (touchPointers.current.size === 2) {
            beginViewportGesture();
            return;
          }
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        activePointer.current = event.pointerId;
        const point = pointFromEvent(event);
        if (activeLayer?.locked || !activeLayer?.visible) return;
        if (props.tool === 'lasso') {
          lassoStart.current = point;
          return;
        }
        if (props.tool === 'object-eraser' || props.tool === 'point-eraser') {
          props.onCommit({ ...props.document, elements: replaceActiveElements(props.tool === 'object-eraser'
            ? eraseElementsAtPoint(activeElements, point, props.width * 2)
            : eraseStrokePointsAtPoint(activeElements, point, props.width * 2)) });
          return;
        }
        strokeRef.current = {
          id: crypto.randomUUID(), type: 'stroke', tool: props.tool as DrawingTool,
          color: props.color, width: props.width, opacity: props.opacity, points: [point], layerId: props.document.activeLayerId,
        };
      }}
      onPointerMove={event => {
        if (event.pointerType === 'touch' && touchPointers.current.has(event.pointerId)) {
          touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (touchPointers.current.size === 2) {
            updateViewportGesture();
            return;
          }
        }
        if (activePointer.current !== event.pointerId) return;
        const point = pointFromEvent(event);
        if (props.tool === 'lasso') return;
        if (props.tool === 'object-eraser' || props.tool === 'point-eraser') {
          props.onCommit({ ...props.document, elements: replaceActiveElements(props.tool === 'object-eraser'
            ? eraseElementsAtPoint(activeElements, point, props.width * 2)
            : eraseStrokePointsAtPoint(activeElements, point, props.width * 2)) });
          return;
        }
        if (!strokeRef.current) return;
        const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
        const points = coalesced.length ? coalesced.map(item => pointFromCoordinates(item, event.currentTarget)) : [point];
        strokeRef.current.points.push(...points);
        renderDrawing(event.currentTarget, { ...props.document, elements: [...props.document.elements, strokeRef.current] });
      }}
      onPointerUp={event => {
        if (event.pointerType === 'touch') {
          touchPointers.current.delete(event.pointerId);
          if (viewportGesture.current) {
            if (touchPointers.current.size < 2) viewportGesture.current = null;
            activePointer.current = null;
            return;
          }
        }
        if (activePointer.current !== event.pointerId) return;
        if (props.tool === 'lasso' && lassoStart.current) {
          const end = pointFromEvent(event);
          const x = Math.min(lassoStart.current.x, end.x);
          const y = Math.min(lassoStart.current.y, end.y);
          props.onSelectionChange(new Set(selectElementsInBounds(visibleElements, {
            x, y, width: Math.abs(end.x - lassoStart.current.x), height: Math.abs(end.y - lassoStart.current.y),
          })));
          lassoStart.current = null;
        } else {
          commitStroke();
        }
        activePointer.current = null;
      }}
      onPointerCancel={event => { touchPointers.current.delete(event.pointerId); viewportGesture.current = null; strokeRef.current = null; activePointer.current = null; }}
    />
  );
}

export default forwardRef(DrawingCanvas);
