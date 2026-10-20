import { useState } from 'react';
import { Info } from 'lucide-react';
import { buildHealthDirection } from '../../../../lib/biometrics/healthDirection';
import { buildScoreRings } from '../../../../lib/biometrics/ouraScoreBands';
import { formatShortDateWarsaw } from '../../../../lib/date';
import IconButton from '../../../ui/IconButton';
import type { DetailsAnchor } from '../ouraTabs';
import { OuraScoreRings } from '../OuraScoreRings';
import type { OuraHealthHubData } from '../types';

interface OuraTodayHeroProps {
  data: OuraHealthHubData;
  asOf: string;
  onOpenDetails: (anchor?: DetailsAnchor) => void;
}

/** Header, one-sentence verdict (week vs week) and the rings. */
export function OuraTodayHero({ data, asOf, onOpenDetails }: OuraTodayHeroProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const summaries = [...(data.ouraHistory ?? []), ...(data.oura ? [data.oura] : [])];
  const enhanced = [...(data.enhancedHistory ?? []), ...(data.enhanced ? [data.enhanced] : [])];
  const direction = buildHealthDirection({ asOf, summaries, enhanced });
  const rings = buildScoreRings({ asOf, summaries, enhanced, strainScore: data.strainRow?.strain_score });
  return (
    <section className="space-y-5" aria-labelledby="oura-today-title">
      <header>
        <p className="text-sm text-text-muted">Pomiary z {formatShortDateWarsaw(asOf)}</p>
        <h1 id="oura-today-title" className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">Dziś</h1>
        <div className="mt-3 flex items-start gap-2">
          <p className="text-lg font-light leading-snug text-text-primary">{direction.headline}</p>
          <IconButton size="sm" label="Jak liczymy kierunek" icon={<Info size={16} />} onClick={() => setInfoOpen(o => !o)}
            aria-expanded={infoOpen} aria-controls="oura-direction-info" className="!text-text-muted" />
        </div>
        {infoOpen && (
          <p id="oura-direction-info" className="mt-1 text-xs leading-5 text-text-muted">
            Średnia z ostatnich 7 dni wobec poprzednich 7. Potrzeba co najmniej 4 dni z pomiarem w każdym tygodniu. To opis zmiany, nie jej przyczyny.
          </p>
        )}
      </header>
      <OuraScoreRings rings={rings} onOpenSleep={() => onOpenDetails('sleep')} onOpenVitals={() => onOpenDetails('recovery')} />
    </section>
  );
}
