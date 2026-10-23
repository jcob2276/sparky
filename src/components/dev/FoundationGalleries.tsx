import { Type, Box, Ban, Calendar, Sparkles } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import SectionTitle from '../ui/SectionTitle';
import { Section, Row } from './galleryPrimitives';

/** Mirrors the effective scale from `src/index.css` (`:root` override) and docs/DESIGN_SYSTEM.md 2.8. */
const TYPE_SCALE: ReadonlyArray<readonly [string, string, string]> = [
  ['text-6xl', '60px', 'Splash large'],
  ['text-5xl', '48px', 'Splash'],
  ['text-4xl', '36px', 'Hero large'],
  ['text-3xl', '34px', 'Tytuł ekranu (PageHeader)'],
  ['text-2xl', '28px', 'Liczba hero, display'],
  ['text-xl', '22px', 'Duże nagłówki'],
  ['text-lg', '20px', 'Nagłówki kart'],
  ['text-base', '17px', 'Primary body, wiersze list'],
  ['text-sm', '15px', 'Opisy, inputy, SectionTitle'],
  ['text-xs', '13px', 'Etykiety i metadane'],
  ['text-2xs', '11px', 'Badge, metadane drugiego poziomu'],
  ['text-3xs', '9px', 'Tylko statusy techniczne'],
];

export function TypographyScaleSection() {
  return (
    <Section icon={<Type size={16} />} title="Skala typografii">
      <div className="space-y-1.5">
        {TYPE_SCALE.map(([token, size, desc]) => (
          <div key={token} className="flex items-baseline gap-3">
            <code className="w-16 shrink-0 font-mono text-2xs text-text-muted">{token}</code>
            <span className={`font-sans ${token} font-semibold text-text-primary ui-num`}>{size}</span>
            <span className="text-2xs text-text-muted">{desc}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function FontStacksSection() {
  return (
    <Section icon={<Type size={16} />} title="Kroje">
      <div className="space-y-2">
        <p className="font-display text-3xl font-bold tracking-tight text-text-primary">Display: SF Pro Display</p>
        <p className="font-sans text-xl font-semibold text-text-primary">Nagłówek: SF Pro, waga 600</p>
        <p className="font-sans text-base text-text-primary">Body: 17px regular</p>
        <p className="font-mono text-sm text-text-muted">Mono: Geist Mono (dane, timery)</p>
      </div>
    </Section>
  );
}

export function SectionTitleGallery() {
  return (
    <Section icon={<Calendar size={16} />} title="SectionTitle">
      <div className="max-w-sm space-y-4">
        <SectionTitle trailing="3 z 5">Dzisiejsze zadania</SectionTitle>
        <SectionTitle as="h3">Sen i regeneracja</SectionTitle>
        <p className="text-xs text-text-muted">Jedna reguła: 15px, waga 600, sentence-case. Bez uppercase i tracking-widest.</p>
      </div>
    </Section>
  );
}

export function SkeletonGallery() {
  return (
    <Section icon={<Box size={16} />} title="Skeleton">
      <div className="max-w-sm space-y-4">
        <Row label="text (3 linie)"><Skeleton variant="text" className="w-full" /></Row>
        <Row label="avatar"><Skeleton variant="avatar" className="w-full" /></Row>
        <Row label="stat (etykieta, liczba, opis)"><Skeleton variant="stat" className="w-full" /></Row>
        <Row label="card"><Skeleton variant="card" lines={3} className="w-full" /></Row>
        <Row label="block"><Skeleton variant="block" className="h-24 w-full" /></Row>
      </div>
    </Section>
  );
}

export function EmptyStateGallery() {
  return (
    <Section icon={<Box size={16} />} title="EmptyState">
      <div className="max-w-sm">
        <EmptyState
          icon={<Sparkles size={22} strokeWidth={1.75} />}
          label="Nic tu jeszcze nie ma"
          description="Dodaj pierwszy wpis, a pojawi się w tym miejscu."
          action={{ label: 'Dodaj pierwszy', onClick: () => {} }}
        />
        <EmptyState compact label="Brak wyników dla tego filtra" />
      </div>
    </Section>
  );
}

const FORBIDDEN: ReadonlyArray<readonly [string, string]> = [
  ['text-3xs font-black uppercase tracking-widest', '<SectionTitle> lub text-xs font-semibold text-text-muted'],
  ['rounded-2xl / rounded-3xl', 'Zaokrąglenia 22px (hero) i 28px (sheet) są teraz mapowane automatycznie; wybieraj świadomie'],
  ['animate-pulse / animate-spin w ładowaniu', '<Skeleton variant="stat|card|text" />'],
  ['emoji jako ikona w EmptyState', 'ikona lucide-react'],
  ['przycisk ikonowy < 44px', '<IconButton /> (hit-area 44px)'],
];

export function ForbiddenPatternsSection() {
  return (
    <Section icon={<Ban size={16} />} title="Zakazane wzorce">
      <ul className="divide-y divide-border-custom overflow-hidden rounded-[var(--radius-grouped)] border border-border-custom bg-surface-2">
        {FORBIDDEN.map(([bad, good]) => (
          <li key={bad} className="space-y-1 px-4 py-3">
            <p className="font-mono text-xs text-danger line-through decoration-danger/40">{bad}</p>
            <p className="text-sm text-text-primary">{good}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
