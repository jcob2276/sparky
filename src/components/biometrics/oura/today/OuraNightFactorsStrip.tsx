import { useState } from 'react';
import { ChevronRight, Coffee, Dumbbell, Flame, Monitor, Smartphone, Utensils } from 'lucide-react';
import type { OuraContextInsights } from '../../../../lib/biometrics/ouraContextInsights';
import type { UseSleepDriversResult } from '../../../../lib/biometrics/sleepDrivers/types';
import DataStateNotice from '../../../core/DataStateNotice';
import Button from '../../../ui/Button';
import Skeleton from '../../../ui/Skeleton';
import { ScreenDetailModal } from '../ScreenDetailModal';
import { OuraSectionHeader } from '../shared/OuraSectionHeader';
import { buildFactorTiles, type FactorKey, type FactorTile } from './nightFactors';

const ICONS: Record<FactorKey, typeof Coffee> = {
  caffeine: Coffee, meal: Utensils, training: Dumbbell, sauna: Flame, phone: Smartphone, pc: Monitor,
};

interface OuraNightFactorsStripProps {
  drivers: UseSleepDriversResult;
  /** Screen details for the night; makes the phone tile open the breakdown. */
  screen?: OuraContextInsights['screen'] | null;
  screenDate?: string | null;
}

function Tile({ tile, onOpen }: { tile: FactorTile; onOpen?: () => void }) {
  const Icon = ICONS[tile.key];
  const muted = tile.state !== 'data';
  const hint = onOpen && tile.state === 'empty' ? 'zobacz czas przed ekranem' : tile.hint;
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-xs text-text-muted">
        <span className="flex min-w-0 items-center gap-1.5"><Icon size={14} aria-hidden="true" className="shrink-0" /><span className="leading-tight">{tile.label}</span></span>
        {onOpen && <ChevronRight size={14} aria-hidden="true" className="shrink-0" />}
      </span>
      <span className={`mt-1.5 block font-light tabular-nums leading-tight ${muted ? 'text-base text-text-secondary' : 'text-lg text-text-primary'}`}>{tile.value}</span>
      {hint && <span className="mt-0.5 block text-xs leading-4 text-text-muted">{hint}</span>}
    </>
  );
  const cls = 'block w-full rounded-xl border border-border-custom/40 bg-surface-1 p-3 text-left';
  return onOpen
    ? <Button variant="ghost" onClick={onOpen} aria-label={`${tile.label}: ${tile.value}. Pokaż szczegóły ekranu`} className={`${cls} !h-auto !flex-col !border !border-border-custom/40 !bg-surface-1 !rounded-xl !p-3 !items-stretch !justify-start !font-normal !text-text-primary hover:!bg-surface-2`}>{body}</Button>
    : <div className={cls} role="group" aria-label={`${tile.label}: ${tile.value}${tile.hint ? `, ${tile.hint}` : ''}`}>{body}</div>;
}

/** One place for the context of the last night: caffeine, meal, training, sauna, phone, computer. */
export function OuraNightFactorsStrip({ drivers, screen, screenDate }: OuraNightFactorsStripProps) {
  const [screenOpen, setScreenOpen] = useState(false);
  const night = drivers.data?.lastNight ?? null;
  const screenAvailable = screen?.status === 'available' && !!screenDate;
  let body;
  if (drivers.isLoading && !drivers.data) {
    body = <div aria-busy="true" aria-label="Ładowanie kontekstu nocy"><Skeleton variant="card" lines={3} /></div>;
  } else if (drivers.error) {
    body = <DataStateNotice tone="warning" title="Nie udało się wczytać kontekstu nocy" detail={drivers.error.message} />;
  } else if (!night) {
    body = <DataStateNotice title="Brak kontekstu ostatniej nocy" detail="Nie ma wpisów o kawie, jedzeniu ani treningu przed ostatnim snem." />;
  } else {
    const tiles = buildFactorTiles(night, drivers.data?.coverage ?? []);
    body = (
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Czynniki przed ostatnią nocą">
        {tiles.map(tile => (
          <li key={tile.key} className="min-w-0">
            <Tile tile={tile} onOpen={tile.key === 'phone' && screenAvailable ? () => setScreenOpen(true) : undefined} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section className="space-y-4" aria-labelledby="oura-night-factors-title">
      <OuraSectionHeader id="oura-night-factors-title" title="Co poprzedzało tę noc"
        subtitle={night?.bedtimeAt ? `Zasypianie o ${night.bedtimeAt}. Odstępy liczone do tej godziny.` : undefined} />
      {body}
      {screenAvailable && screen && screenDate && (
        <ScreenDetailModal isOpen={screenOpen} onClose={() => setScreenOpen(false)} screen={screen} date={screenDate} />
      )}
    </section>
  );
}
