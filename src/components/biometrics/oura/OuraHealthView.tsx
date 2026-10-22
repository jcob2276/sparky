import { ArrowLeft, Compass, Layers, RefreshCw } from 'lucide-react';
import type { UseSleepDriversResult } from '../../../lib/biometrics/sleepDrivers/types';
import { OuraTodayView } from './today/OuraTodayView';
import { OuraDetailsView } from './details/OuraDetailsView';
import type { OuraHealthHubData } from './types';
import type { DetailsAnchor, OuraSection } from './ouraTabs';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import './ouraTheme.css';
import DataStateNotice from '../../core/DataStateNotice';
interface OuraHealthViewProps {
  activeSection: OuraSection;
  data: OuraHealthHubData;
  detailsAnchor?: DetailsAnchor;
  drivers: UseSleepDriversResult;
  isLoading?: boolean;
  isSyncing?: boolean;
  onExit?: () => void;
  onOpenDetails: (anchor?: DetailsAnchor) => void;
  onSectionChange: (section: OuraSection) => void;
  onSync?: () => void;
}

const NAV_ITEMS = [
  { id: 'today' as const, label: 'Dziś', icon: Compass },
  { id: 'details' as const, label: 'Szczegóły', icon: Layers },
];

export function OuraHealthView({
  activeSection,
  data,
  detailsAnchor,
  drivers,
  isLoading = false,
  isSyncing = false,
  onExit,
  onOpenDetails,
  onSectionChange,
  onSync,
}: OuraHealthViewProps) {
  return (
    <div className="oura-theme dark min-h-screen text-text-primary">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-4 sm:px-6">
        <IconButton
          label="Wróć"
          icon={<ArrowLeft size={22} />}
          onClick={onExit}
        />
        <p className="text-sm font-light tracking-wide text-text-secondary">Sparky · Zdrowie</p>
        {onSync ? (
          <IconButton
            label="Synchronizuj z Oura"
            icon={<RefreshCw size={19} className={isSyncing ? 'animate-spin text-info' : ''} />}
            onClick={onSync}
            disabled={isSyncing}
          />
        ) : (
          <span className="h-11 w-11" aria-hidden="true" />
        )}
      </header>
      <main
        data-testid="oura-content"
        className="mx-auto w-full max-w-3xl px-4 pb-36 pt-7 sm:px-6"
      >
        <HealthReadErrors errors={data.sourceErrors} />
        {isLoading ? (
          <div className="grid min-h-96 place-items-center text-sm text-text-muted">
            Synchronizuję pomiary zdrowia…
          </div>
        ) : activeSection === 'today' ? (
          <OuraTodayView data={data} drivers={drivers} onOpenDetails={onOpenDetails} />
        ) : (
          <OuraDetailsView data={data} drivers={drivers} initialAnchor={detailsAnchor} />
        )}
      </main>

      {/* sticky in normal flow (not fixed): stays centred in the page column even if an ancestor changes the fixed containing block */}
      <div className="pointer-events-none sticky bottom-4 z-50 px-4">
        <nav
          aria-label="Sekcje zdrowia"
          className="pointer-events-auto mx-auto flex max-w-xs items-center justify-around rounded-full border border-white/10 bg-surface-1/90 p-2 shadow-2xl backdrop-blur-xl"
        >
          {NAV_ITEMS.map(({ icon: Icon, id, label }) => {
            const active = activeSection === id;
            return (
              <Button
                key={id}
                aria-label={label}
                aria-pressed={active}
                className={`!min-h-12 !min-w-24 !flex-col !gap-1 !rounded-full !px-2.5 !text-xs ${
                  active ? '!bg-white/10 !text-white' : '!text-text-muted'
                }`}
                onClick={() => onSectionChange(id)}
                variant="ghost"
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                <span>{label}</span>
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function HealthReadErrors({ errors }: { errors: OuraHealthHubData['sourceErrors'] }) {
  return errors?.length ? <DataStateNotice tone="warning" title="Część danych zdrowia jest niedostępna" detail={errors.map((error) => `${error.source}: ${error.message}`).join(' · ')} /> : null;
}
