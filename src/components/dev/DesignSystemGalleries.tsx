import Button from '../ui/Button';
import { useState } from 'react';
import { Layers, Palette, Box, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Tabs from '../ui/Tabs';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { CharacterAvatar } from '../ui/CharacterAvatar';

import { Section, Row } from './galleryPrimitives';

/* -- tiny helpers -- */

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-10 w-10 rounded-xl border border-border-custom/30 ${className}`} />
      <span className="text-2xs font-bold text-text-muted">{label}</span>
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-border-custom/30" />;
}

/* -- gallery sections -- */

export function ColorTokensSection() {
  return (
    <Section icon={<Palette size={16} />} title="Semantic Colors">
      <Row label="Status">
        <Swatch className="bg-success" label="success" />
        <Swatch className="bg-success-hover" label="success-hover" />
        <Swatch className="bg-warning" label="warning" />
        <Swatch className="bg-warning-hover" label="warning-hover" />
        <Swatch className="bg-danger" label="danger" />
        <Swatch className="bg-danger-hover" label="danger-hover" />
        <Swatch className="bg-info" label="info" />
        <Swatch className="bg-info-hover" label="info-hover" />
      </Row>
      <Row label="Surfaces">
        <Swatch className="bg-surface-1 border" label="surface-1" />
        <Swatch className="bg-surface-2 border" label="surface-2" />
        <Swatch className="bg-surface-3 border" label="surface-3" />
        <Swatch className="bg-surface-tonal border" label="tonal" />
        <Swatch className="bg-surface-tonal-strong border" label="tonal-strong" />
      </Row>
      <Row label="Text">
        <div className="flex items-center gap-4">
          <span className="text-text-primary text-sm font-bold">text-primary</span>
          <span className="text-text-secondary text-sm">text-secondary</span>
          <span className="text-text-muted text-sm">text-muted</span>
          <span className="text-text-tertiary text-sm">text-tertiary</span>
        </div>
      </Row>
    </Section>
  );
}

export function ButtonGallery() {
  return (
    <Section icon={<Box size={16} />} title="Button">
      <Row label="Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="tonal">Tonal</Button>
      </Row>
      <Row label="Sizes">
        <Button variant="primary" size="sm">Small</Button>
        <Button variant="primary" size="md">Medium</Button>
        <Button variant="primary" size="lg">Large</Button>
      </Row>
      <Row label="States">
        <Button variant="primary" loading>Loading</Button>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="primary" icon={<Sparkles size={14} />}>With Icon</Button>
        <Button variant="danger" icon={<Sparkles size={14} />} iconPosition="right">Icon Right</Button>
      </Row>
    </Section>
  );
}

export function CardGallery() {
  return (
    <Section icon={<Layers size={16} />} title="Card">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['glass', 'immersive', 'canvas', 'receipt', 'outline', 'notice', 'danger', 'accent'] as const).map(v => (
          <Card key={v} variant={v} padding="1rem">
            <p className="text-xs font-semibold text-text-muted mb-1">{v}</p>
            <p className="text-sm text-text-secondary">Variant content goes here.</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export function BadgeGallery() {
  return (
    <Section icon={<Sparkles size={16} />} title="Badge">
      <Row label="Count">
        <Badge variant="count" count={3} />
        <Badge variant="count" count={42} />
        <Badge variant="count" count={999} />
        <Badge variant="count" count={7} color="var(--color-danger)" />
      </Row>
      <Row label="Dot">
        <Badge variant="dot" />
        <Badge variant="dot" color="var(--color-success)" />
        <Badge variant="dot" color="var(--color-warning)" />
      </Row>
      <Row label="Tag">
        <Badge variant="tag">Pilne</Badge>
        <Badge variant="tag" color="var(--color-success)">Gotowe</Badge>
        <Badge variant="tag" color="var(--color-danger)">Krytyczne</Badge>
      </Row>
    </Section>
  );
}

const TAB_DEMO = [
  { key: 'tab1', label: 'Dzisiaj' },
  { key: 'tab2', label: 'Tydzien' },
  { key: 'tab3', label: 'Miesiac' },
];

export function TabsGallery() {
  const [activeTab, setActiveTab] = useState('tab1');
  return (
    <Section icon={<Box size={16} />} title="Tabs">
      <div className="max-w-sm">
        <Tabs tabs={TAB_DEMO} active={activeTab} onChange={setActiveTab} />
      </div>
      <p className="text-xs text-text-muted">Active: <span className="font-bold text-text-primary">{activeTab}</span></p>
    </Section>
  );
}

export function ModalGallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  return (
    <Section icon={<Box size={16} />} title="Modal">
      <Row>
        {(['sm', 'md', 'lg', 'xl'] as const).map(s => (
          <Button key={s} variant="outline" size="sm" onClick={() => { setModalSize(s); setModalOpen(true); }}>
            Open {s}
          </Button>
        ))}
      </Row>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Modal Showcase" subtitle="design-system" size={modalSize}>
        <div className="space-y-3 py-2">
          <p className="text-sm text-text-secondary">
            Size: <span className="font-bold text-text-primary">{modalSize}</span> -- this is the content area.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>Confirm</Button>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </Section>
  );
}

export function SpinnerGallery() {
  return (
    <Section icon={<Sparkles size={16} />} title="Spinner">
      <div className="flex items-end gap-6">
        <div className="flex flex-col items-center gap-1"><Spinner size="sm" /><span className="text-2xs font-bold text-text-muted">sm</span></div>
        <div className="flex flex-col items-center gap-1"><Spinner size="md" /><span className="text-2xs font-bold text-text-muted">md</span></div>
        <div className="flex flex-col items-center gap-1"><Spinner size="lg" /><span className="text-2xs font-bold text-text-muted">lg</span></div>
      </div>
    </Section>
  );
}

export function CharacterAvatarGallery() {
  return (
    <Section icon={<Sparkles size={16} />} title="CharacterAvatar">
      <Row>
        {['Jakub', 'Alice', 'Bob', 'System', 'Dev'].map(seed => (
          <div key={seed} className="flex flex-col items-center gap-1">
            <CharacterAvatar seed={seed} size={40} />
            <span className="text-2xs font-bold text-text-muted">{seed}</span>
          </div>
        ))}
      </Row>
    </Section>
  );
}

export function CssVariablesReference() {
  return (
    <Section icon={<Palette size={16} />} title="CSS Variables (copy-paste)">
      <div className="rounded-xl border border-border-custom/30 bg-surface p-4 font-mono text-xs text-text-secondary space-y-1 overflow-x-auto">
        <p><span className="text-info">--color-info</span>        <span className="text-text-muted">var(--color-info)</span></p>
        <p><span className="text-success">--color-success</span>    <span className="text-text-muted">var(--color-success)</span></p>
        <p><span className="text-warning">--color-warning</span>    <span className="text-text-muted">var(--color-warning)</span></p>
        <p><span className="text-danger">--color-danger</span>      <span className="text-text-muted">var(--color-danger)</span></p>
        <p className="text-text-muted mt-2">Tailwind classes: bg-danger, text-success, border-warning, bg-surface-2, etc.</p>
      </div>
    </Section>
  );
}
