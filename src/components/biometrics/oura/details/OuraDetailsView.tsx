import type { UseSleepDriversResult } from '../../../../lib/biometrics/sleepDrivers/types';
import { OuraSleepRegularitySection } from '../OuraSleepRegularitySection';
import { OuraRhythmTiles } from '../OuraRhythmTiles';
import { OuraVitalsView } from '../OuraVitalsView';
import { SleepDetailView } from '../SleepDetailView';
import { OuraSectionHeader } from '../shared/OuraSectionHeader';
import type { DetailsAnchor } from '../ouraTabs';
import type { OuraHealthHubData } from '../types';
import { DetailsAnchorBar } from './DetailsAnchorBar';
import { DetailsChartsSection } from './DetailsChartsSection';
import { DetailsDriversSection } from './DetailsDriversSection';
import { useDetailsAnchor } from './useDetailsAnchor';

export interface OuraDetailsViewProps {
  data: OuraHealthHubData;
  drivers: UseSleepDriversResult;
  initialAnchor?: DetailsAnchor;
}

/** Zakładka „Szczegóły”: pełna głębia (sen, rytm, zależności, regeneracja, wykresy) bez powtarzania „Dziś”. */
export function OuraDetailsView({ data, drivers, initialAnchor }: OuraDetailsViewProps) {
  const { active, root, scrollTo } = useDetailsAnchor(initialAnchor);
  return (
    <div ref={root} data-testid="oura-details" className="space-y-10">
      <DetailsAnchorBar active={active} onSelect={scrollTo} />

      <section id="sleep" data-anchor="sleep" className="scroll-mt-20 space-y-4" aria-labelledby="details-sleep-title">
        <OuraSectionHeader id="details-sleep-title" title="Sen" subtitle="Pełny przebieg ostatniej nocy: fazy, tętno, HRV i ruch." />
        <SleepDetailView data={data} />
      </section>

      <section id="rhythm" data-anchor="rhythm" className="scroll-mt-20 space-y-4" aria-labelledby="details-rhythm-title">
        <OuraSectionHeader id="details-rhythm-title" title="Rytm i regularność" subtitle="Pora zasypiania, zegar biologiczny i bilans snu." />
        {data.userId && <OuraSleepRegularitySection userId={data.userId} />}
        <OuraRhythmTiles data={data} />
      </section>

      <DetailsDriversSection data={data} drivers={drivers} />

      <section id="recovery" data-anchor="recovery" className="scroll-mt-20 space-y-4" aria-labelledby="details-recovery-title">
        <OuraSectionHeader id="details-recovery-title" title="Regeneracja i serce" subtitle="Parametry życiowe na tle Twoich norm oraz wiek biologiczny." />
        <OuraVitalsView data={data} />
      </section>

      <DetailsChartsSection userId={data.userId} />
    </div>
  );
}
