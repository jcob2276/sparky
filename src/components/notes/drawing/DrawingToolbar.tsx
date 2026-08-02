import { Eraser, Highlighter, Lasso, Pencil, Redo2, Ruler, Undo2 } from 'lucide-react';
import type { DrawingTool } from '../../../lib/drawing/drawingModel';
import { Pressable } from '../../ui/ControlPrimitives';

export type ActiveDrawingTool = DrawingTool | 'point-eraser' | 'object-eraser' | 'lasso';

interface DrawingToolbarProps {
  tool: ActiveDrawingTool;
  color: string;
  width: number;
  opacity: number;
  onToolChange: (tool: ActiveDrawingTool) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  ruler: boolean;
  onRulerChange: (enabled: boolean) => void;
}

const TOOLS: Array<{ id: ActiveDrawingTool; label: string; icon: React.ReactNode }> = [
  { id: 'pen', label: 'Pióro', icon: <Pencil size={18} /> },
  { id: 'pencil', label: 'Ołówek', icon: <Pencil size={18} /> },
  { id: 'fountain', label: 'Pióro wieczne', icon: <Pencil size={18} /> },
  { id: 'marker', label: 'Marker', icon: <Highlighter size={18} /> },
  { id: 'highlighter', label: 'Zakreślacz', icon: <Highlighter size={18} /> },
  { id: 'object-eraser', label: 'Gumka obiektowa', icon: <Eraser size={18} /> },
  { id: 'point-eraser', label: 'Gumka punktowa', icon: <Eraser size={18} /> },
  { id: 'lasso', label: 'Lasso', icon: <Lasso size={18} /> },
];

export default function DrawingToolbar(props: DrawingToolbarProps) {
  return (
    <div className="drawing-toolbar" aria-label="Narzędzia rysowania">
      <div className="drawing-toolbar-tools">
        {TOOLS.map(item => (
          <Pressable
            type="button"
            key={item.id}
            aria-label={item.label}
            aria-pressed={props.tool === item.id}
            onClick={() => props.onToolChange(item.id)}
          >{item.icon}</Pressable>
        ))}
      </div>
      <label className="drawing-toolbar-color">Kolor<input type="color" value={props.color} onChange={event => props.onColorChange(event.target.value)} /></label>
      <label>Grubość<input aria-label="Grubość" type="range" min="1" max="40" value={props.width} onChange={event => props.onWidthChange(Number(event.target.value))} /></label>
      <label>Krycie<input aria-label="Krycie" type="range" min="0.1" max="1" step="0.1" value={props.opacity} onChange={event => props.onOpacityChange(Number(event.target.value))} /></label>
      <div className="drawing-toolbar-history">
        <Pressable type="button" aria-label="Linijka" aria-pressed={props.ruler} onClick={() => props.onRulerChange(!props.ruler)}><Ruler size={18} /></Pressable>
        <Pressable type="button" aria-label="Cofnij" onClick={props.onUndo}><Undo2 size={18} /></Pressable>
        <Pressable type="button" aria-label="Ponów" onClick={props.onRedo}><Redo2 size={18} /></Pressable>
      </div>
    </div>
  );
}
