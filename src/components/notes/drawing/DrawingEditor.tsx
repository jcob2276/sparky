/* eslint-disable max-lines-per-function -- Fullscreen editor coordinates persistence, export and recovery state. */
import { Download, FileSearch, FileText, Layers3, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { recognizeNoteImage } from '../../../lib/noteAttachmentsApi';
import { saveNoteDrawing, updateNoteDrawingOcr, useNoteDrawing } from '../../../lib/noteDrawingsApi';
import { notify } from '../../../lib/notify';
import DrawingCanvas from './DrawingCanvas';
import { DrawingHistory } from '../../../lib/drawing/drawingEngine';
import { createDrawingDocument, parseDrawingDocument, type DrawingDocument, type DrawingShape } from '../../../lib/drawing/drawingModel';
import { canvasRegionToPng, canvasToPng } from './drawingRenderer';
import DrawingToolbar, { type ActiveDrawingTool } from './DrawingToolbar';
import DrawingInspector from './DrawingInspector';
import { duplicateElements, getElementsBounds, replaceSelectionWithText, transformElements } from '../../../lib/drawing/drawingEngine';
import { Pressable } from '../../ui/ControlPrimitives';
import DrawingLayers from './DrawingLayers';
import { notesKeys } from '../../../lib/queryKeys';

interface DrawingEditorProps {
  userId: string;
  noteId: string;
  onClose: () => void;
  onInsertText?: (text: string) => void;
}

const draftKey = (noteId: string) => `vanguard_note_drawing_draft_${noteId}`;

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function DrawingEditor({ userId, noteId, onClose, onInsertText }: DrawingEditorProps) {
  const { data: savedDrawing, isLoading } = useNoteDrawing(noteId);
  const queryClient = useQueryClient();
  const [document, setDocument] = useState<DrawingDocument>(() => createDrawingDocument(1200, 1600));
  const [tool, setTool] = useState<ActiveDrawingTool>('pen');
  const [color, setColor] = useState('#111111');
  const [width, setWidth] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [ruler, setRuler] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [shapeSuggestion, setShapeSuggestion] = useState<DrawingShape | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [showLayers, setShowLayers] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef(new DrawingHistory(document));

  useEffect(() => {
    if (isLoading) return;
    let next = savedDrawing?.document ?? createDrawingDocument(1200, 1600);
    try {
      const draft = localStorage.getItem(draftKey(noteId));
      if (draft) {
        const parsed = parseDrawingDocument(JSON.parse(draft));
        if (new Date(parsed.updatedAt) > new Date(next.updatedAt)) next = parsed;
      }
    } catch {
      localStorage.removeItem(draftKey(noteId));
    }
    queueMicrotask(() => {
      setDocument(next);
      historyRef.current = new DrawingHistory(next);
    });
  }, [isLoading, noteId, savedDrawing]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(draftKey(noteId), JSON.stringify(document)); } catch { /* quota */ }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [dirty, document, noteId]);

  const commit = (next: DrawingDocument) => {
    const committed = historyRef.current.commit(next);
    setDocument(committed);
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const preview = canvasRef.current ? await canvasToPng(canvasRef.current) : undefined;
      await saveNoteDrawing(userId, noteId, document, preview);
      localStorage.removeItem(draftKey(noteId));
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ['notes', 'drawing', noteId] });
      await queryClient.invalidateQueries({ queryKey: notesKeys.all });
      notify('Rysunek zapisany', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się zapisać rysunku', 'error');
    } finally {
      setBusy(false);
    }
  };

  const recognize = async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const selectionBounds = selectedIds.size ? getElementsBounds(document.elements, selectedIds) : null;
      const png = selectionBounds
        ? await canvasRegionToPng(canvasRef.current, document, selectionBounds)
        : await canvasToPng(canvasRef.current);
      const text = await recognizeNoteImage(new File([png], 'pismo.png', { type: 'image/png' }));
      await updateNoteDrawingOcr(noteId, text);
      setOcrText(text);
      notify(text ? 'Pismo zostało rozpoznane' : 'Nie rozpoznano tekstu', text ? 'success' : 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'OCR nie powiódł się', 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportPng = async () => {
    if (canvasRef.current) downloadBlob(await canvasToPng(canvasRef.current), 'rysunek.png');
  };

  const exportPdf = async () => {
    if (!canvasRef.current) return;
    const png = await canvasToPng(canvasRef.current);
    const url = URL.createObjectURL(png);
    const printable = window.open('', '_blank', 'noopener,noreferrer');
    if (!printable) throw new Error('Przeglądarka zablokowała eksport PDF.');
    printable.document.write(`<img src="${url}" style="display:block;max-width:100%;margin:auto"><script>addEventListener('load',()=>{print();setTimeout(()=>close(),500)})</script>`);
    printable.document.close();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="drawing-editor" role="dialog" aria-modal="true" aria-label="Rysunek i pismo odręczne">
      <header className="drawing-editor-header">
        <Pressable type="button" onClick={onClose} aria-label="Zamknij rysunek"><X /></Pressable>
        <strong>Markup</strong>
        <div>
          <Pressable type="button" disabled={busy} onClick={() => { void recognize(); }} aria-label="Rozpoznaj pismo"><FileSearch /></Pressable>
          <Pressable type="button" aria-pressed={showLayers} onClick={() => setShowLayers(value => !value)} aria-label="Warstwy"><Layers3 /></Pressable>
          <Pressable type="button" disabled={busy} onClick={() => { void exportPng(); }} aria-label="Eksportuj PNG"><Download /></Pressable>
          <Pressable type="button" disabled={busy} onClick={() => { void exportPdf().catch(error => notify(error.message, 'error')); }} aria-label="Eksportuj PDF"><FileText /></Pressable>
          <Pressable type="button" disabled={busy || !dirty} onClick={() => { void save(); }} aria-label="Zapisz rysunek"><Save /></Pressable>
        </div>
      </header>
      <main className="drawing-editor-stage">
        {isLoading ? <p>Ładowanie rysunku…</p> : <DrawingCanvas
          document={document}
          tool={tool}
          color={color}
          width={width}
          opacity={opacity}
          onCommit={commit}
          ref={canvasRef}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onShapeSuggestion={setShapeSuggestion}
          ruler={ruler}
          onViewportChange={viewport => { setDocument(current => ({ ...current, viewport, updatedAt: new Date().toISOString() })); setDirty(true); }}
        />}
        <DrawingInspector
          selectedCount={selectedIds.size}
          onMove={(x, y) => commit({ ...document, elements: transformElements(document.elements, selectedIds, { translateX: x, translateY: y, scale: 1, rotation: 0 }) })}
          onScale={scale => commit({ ...document, elements: transformElements(document.elements, selectedIds, { translateX: 0, translateY: 0, scale, rotation: 0 }) })}
          onRotate={rotation => commit({ ...document, elements: transformElements(document.elements, selectedIds, { translateX: 0, translateY: 0, scale: 1, rotation }) })}
          onDuplicate={() => commit({ ...document, elements: duplicateElements(document.elements, selectedIds) })}
          onDelete={() => { commit({ ...document, elements: document.elements.filter(element => !selectedIds.has(element.id)) }); setSelectedIds(new Set()); }}
        />
        {showLayers && <DrawingLayers
          layers={document.layers}
          activeLayerId={document.activeLayerId}
          onChange={(layers, activeLayerId) => {
            const validIds = new Set(layers.map(layer => layer.id));
            commit({
              ...document,
              layers,
              activeLayerId,
              elements: document.elements.map(element => validIds.has(element.layerId ?? 'default')
                ? element
                : { ...element, layerId: activeLayerId }),
            });
          }}
        />}
        {shapeSuggestion && <div className="drawing-shape-suggestion">
          <span>Wyrównać do kształtu?</span>
          <Pressable type="button" onClick={() => setShapeSuggestion(null)}>Zostaw</Pressable>
          <Pressable type="button" onClick={() => {
            commit({ ...document, elements: document.elements.map(element => element.id === shapeSuggestion.id ? shapeSuggestion : element) });
            setShapeSuggestion(null);
          }}>Wyrównaj</Pressable>
        </div>}
        {ocrText && <div className="drawing-ocr-result">
          <p>{ocrText}</p>
          <Pressable type="button" onClick={() => { void navigator.clipboard?.writeText(ocrText); }}>Kopiuj</Pressable>
          {selectedIds.size > 0 && <Pressable type="button" onClick={() => {
            commit({ ...document, elements: replaceSelectionWithText(document.elements, selectedIds, ocrText) });
            setSelectedIds(new Set());
            setOcrText('');
          }}>Zastąp zaznaczenie</Pressable>}
          {onInsertText && <Pressable type="button" onClick={() => { onInsertText(ocrText); setOcrText(''); }}>Wstaw do notatki</Pressable>}
          <Pressable type="button" onClick={() => setOcrText('')}>Zamknij</Pressable>
        </div>}
      </main>
      <DrawingToolbar
        tool={tool}
        color={color}
        width={width}
        opacity={opacity}
        onToolChange={setTool}
        onColorChange={setColor}
        onWidthChange={setWidth}
        onOpacityChange={setOpacity}
        onUndo={() => { setDocument(historyRef.current.undo()); setDirty(true); }}
        onRedo={() => { setDocument(historyRef.current.redo()); setDirty(true); }}
        ruler={ruler}
        onRulerChange={setRuler}
      />
    </div>
  );
}
