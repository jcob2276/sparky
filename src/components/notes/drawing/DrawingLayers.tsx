import { Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from 'lucide-react';
import type { DrawingLayer } from '../../../lib/drawing/drawingModel';
import { Pressable } from '../../ui/ControlPrimitives';

interface DrawingLayersProps {
  layers: DrawingLayer[];
  activeLayerId: string;
  onChange: (layers: DrawingLayer[], activeLayerId: string) => void;
}

export default function DrawingLayers({ layers, activeLayerId, onChange }: DrawingLayersProps) {
  const patchLayer = (id: string, patch: Partial<DrawingLayer>) => onChange(
    layers.map(layer => layer.id === id ? { ...layer, ...patch } : layer),
    activeLayerId,
  );
  const addLayer = () => {
    const id = crypto.randomUUID();
    onChange([...layers, { id, name: `Warstwa ${layers.length + 1}`, visible: true, locked: false }], id);
  };
  const removeLayer = (id: string) => {
    if (layers.length === 1) return;
    const next = layers.filter(layer => layer.id !== id);
    onChange(next, activeLayerId === id ? next[0].id : activeLayerId);
  };

  return (
    <aside className="drawing-layers" aria-label="Warstwy rysunku">
      <div className="drawing-layers-header"><strong>Warstwy</strong><Pressable onClick={addLayer} aria-label="Dodaj warstwę"><Plus size={16} /></Pressable></div>
      {layers.map(layer => (
        <div className={`drawing-layer-row ${layer.id === activeLayerId ? 'active' : ''}`} key={layer.id}>
          <Pressable onClick={() => onChange(layers, layer.id)} aria-label={`Wybierz ${layer.name}`}>{layer.name}</Pressable>
          <Pressable onClick={() => patchLayer(layer.id, { visible: !layer.visible })} aria-label={`${layer.visible ? 'Ukryj' : 'Pokaż'} ${layer.name}`}>
            {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </Pressable>
          <Pressable onClick={() => patchLayer(layer.id, { locked: !layer.locked })} aria-label={`${layer.locked ? 'Odblokuj' : 'Zablokuj'} ${layer.name}`}>
            {layer.locked ? <Lock size={15} /> : <LockOpen size={15} />}
          </Pressable>
          <Pressable disabled={layers.length === 1} onClick={() => removeLayer(layer.id)} aria-label={`Usuń ${layer.name}`}><Trash2 size={15} /></Pressable>
        </div>
      ))}
    </aside>
  );
}
