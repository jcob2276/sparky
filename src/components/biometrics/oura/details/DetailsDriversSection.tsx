import type { UseSleepDriversResult } from '../../../../lib/biometrics/sleepDrivers/types';
import DataStateNotice from '../../../core/DataStateNotice';
import Skeleton from '../../../ui/Skeleton';
import { OuraPersonalEvidence } from '../OuraPersonalEvidence';
import { OuraSectionHeader } from '../shared/OuraSectionHeader';
import type { OuraHealthHubData } from '../types';
import { DriverCard } from './DriverCard';
import { DriversCoverage } from './DriversCoverage';
import { DriversTop5 } from './DriversTop5';
import { driversWithoutConclusions, groupEffectsByDriver } from './driverGroups';

interface Props {
  data: OuraHealthHubData;
  drivers: UseSleepDriversResult;
}

function Body({ drivers }: { drivers: UseSleepDriversResult }) {
  if (drivers.isLoading) {
    return <div aria-busy="true" aria-label="Ładowanie zależności snu"><Skeleton variant="card" lines={5} /></div>;
  }
  if (drivers.error) {
    return <DataStateNotice tone="warning" title="Nie udało się policzyć zależności snu"
      detail="Odśwież stronę, aby ponowić. Pozostałe sekcje działają normalnie." />;
  }
  const result = drivers.data;
  if (!result) {
    return <p className="rounded-xl border border-white/5 bg-surface-1 p-5 text-sm text-text-muted">
      Brak danych do analizy zależności snu.
    </p>;
  }
  const groups = groupEffectsByDriver(result.effects);
  const noConclusion = driversWithoutConclusions(result.effects, result.coverage);
  return (
    <>
      <p className="text-xs leading-5 text-text-muted">
        Korelacja, nie dowód: pokazujemy, co współwystępuje z lepszym lub gorszym snem u Ciebie
        ({result.nightsAnalyzed} nocy w analizie).
      </p>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-white/5 bg-surface-1 p-5 text-sm text-text-muted">
          Na razie żaden czynnik nie ma dość nocy na wniosek. Zobacz pokrycie danych poniżej.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => <DriverCard key={group.driver} group={group} />)}
        </div>
      )}
      <DriversTop5 effects={result.top5Effects} />
      <DriversCoverage coverage={result.coverage} noConclusion={noConclusion} />
    </>
  );
}

/** Serce zakładki: pełna lista zależności snu wg czynników, Top 5 i pokrycie danych. */
export function DetailsDriversSection({ data, drivers }: Props) {
  return (
    <section id="drivers" data-anchor="drivers" className="scroll-mt-20 space-y-5" aria-labelledby="details-drivers-title">
      <OuraSectionHeader
        id="details-drivers-title"
        title="Zależności snu"
        subtitle="Co z Twojego dnia współgra z jakością nocy: trening, sauna, posiłek, kawa, telefon i komputer."
      />
      <Body drivers={drivers} />
      <OuraPersonalEvidence data={data} />
    </section>
  );
}
