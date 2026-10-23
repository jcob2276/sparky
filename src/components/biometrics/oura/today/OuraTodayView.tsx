import { ArrowRight } from 'lucide-react';
import { getTodayWarsaw } from '../../../../lib/date';
import type { UseSleepDriversResult } from '../../../../lib/biometrics/sleepDrivers/types';
import Button from '../../../ui/Button';
import { OuraBaselineSection } from '../OuraBaselineSection';
import { OuraDayNightSection } from '../OuraDayNightSection';
import type { DetailsAnchor } from '../ouraTabs';
import type { OuraHealthHubData } from '../types';
import { PhoneSignalsSection } from '../phone/PhoneSignalsSection';
import { OuraDriverEffects } from './OuraDriverEffects';
import { OuraNightFactorsStrip } from './OuraNightFactorsStrip';
import { OuraTodayHero } from './OuraTodayHero';

export interface OuraTodayViewProps {
  data: OuraHealthHubData;
  drivers: UseSleepDriversResult;
  onOpenDetails: (anchor?: DetailsAnchor) => void;
}

/** Zakładka Dziś: werdykt, odchylenia od normy, oś dzień → noc, kontekst nocy, zależności. Tylko do odczytu. */
export function OuraTodayView({ data, drivers, onOpenDetails }: OuraTodayViewProps) {
  const asOf = data.date ?? data.oura?.date ?? data.enhanced?.date ?? getTodayWarsaw();
  const nightContext = data.nightContext ?? null;
  return (
    <div className="space-y-10" data-testid="oura-today">
      <OuraTodayHero data={data} asOf={asOf} onOpenDetails={onOpenDetails} />
      {data.userId && <OuraBaselineSection userId={data.userId} asOf={asOf} mode="deviations" />}
      {data.userId && <OuraDayNightSection userId={data.userId} latestNight={asOf} />}
      <OuraNightFactorsStrip drivers={drivers} screen={nightContext?.screen} screenDate={nightContext?.date} />
      {data.userId && <PhoneSignalsSection userId={data.userId} />}
      <OuraDriverEffects drivers={drivers} onOpenDrivers={() => onOpenDetails('drivers')} />
      <Button variant="outline" onClick={() => onOpenDetails('sleep')} icon={<ArrowRight size={16} />} iconPosition="right" className="w-full">
        Szczegóły snu, regularność i parametry
      </Button>
    </div>
  );
}
