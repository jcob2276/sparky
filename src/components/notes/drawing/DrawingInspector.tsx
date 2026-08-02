import { Copy, RotateCw, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface DrawingInspectorProps {
  selectedCount: number;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onRotate: (radians: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function DrawingInspector(props: DrawingInspectorProps) {
  if (!props.selectedCount) return null;
  return (
    <div className="drawing-inspector" aria-label="Zaznaczenie">
      <span>{props.selectedCount} zazn.</span>
      <Pressable type="button" onClick={() => props.onMove(-10, 0)} aria-label="Przesuń w lewo">←</Pressable>
      <Pressable type="button" onClick={() => props.onMove(10, 0)} aria-label="Przesuń w prawo">→</Pressable>
      <Pressable type="button" onClick={() => props.onMove(0, -10)} aria-label="Przesuń w górę">↑</Pressable>
      <Pressable type="button" onClick={() => props.onMove(0, 10)} aria-label="Przesuń w dół">↓</Pressable>
      <Pressable type="button" onClick={() => props.onScale(0.9)} aria-label="Pomniejsz zaznaczenie"><ZoomOut size={16} /></Pressable>
      <Pressable type="button" onClick={() => props.onScale(1.1)} aria-label="Powiększ zaznaczenie"><ZoomIn size={16} /></Pressable>
      <Pressable type="button" onClick={() => props.onRotate(Math.PI / 12)} aria-label="Obróć zaznaczenie"><RotateCw size={16} /></Pressable>
      <Pressable type="button" onClick={props.onDuplicate} aria-label="Duplikuj zaznaczenie"><Copy size={16} /></Pressable>
      <Pressable type="button" onClick={props.onDelete} aria-label="Usuń zaznaczenie"><Trash2 size={16} /></Pressable>
    </div>
  );
}
