import { usePhoneSignalsInsights } from '../../../../lib/phoneSignals/usePhoneSignalsInsights';
import DataStateNotice from '../../../core/DataStateNotice';
import Skeleton from '../../../ui/Skeleton';
import { OuraSectionHeader } from '../shared/OuraSectionHeader';
import { PhoneCorrelationsBlock } from './PhoneCorrelationsBlock';
import { PhoneInterruptionsBlock } from './PhoneInterruptionsBlock';
import { PhonePlacesBlock } from './PhonePlacesBlock';
import { PhoneSleepBlock } from './PhoneSleepBlock';

interface PhoneSignalsSectionProps {
  userId: string;
}

/** Zakładka Dziś: dodatkowe źródło snu i kontekst dnia z kolektorów telefonu (APK). Tylko do odczytu. */
export function PhoneSignalsSection({ userId }: PhoneSignalsSectionProps) {
  const query = usePhoneSignalsInsights(userId);
  const insights = query.data;
  let body;
  if (query.isLoading) {
    body = <div aria-busy="true" aria-label="Ładowanie sygnałów z telefonu"><Skeleton variant="card" lines={3} /></div>;
  } else if (query.error) {
    body = <DataStateNotice tone="warning" title="Nie udało się wczytać sygnałów z telefonu" detail={query.error.message} />;
  } else if (!insights || insights.daysWithData === 0) {
    body = (
      <DataStateNotice
        title="Telefon jeszcze nic nie zebrał"
        detail="Włącz kolektory w Ustawienia → Dane z telefonu. Pierwsze dane pojawią się po kilku godzinach, wnioski po kilkunastu dniach."
      />
    );
  } else {
    body = (
      <div className="space-y-6 rounded-2xl border border-border-custom/40 bg-surface-1 p-4">
        <PhoneSleepBlock sleep={insights.sleep} />
        <PhoneInterruptionsBlock interruptions={insights.interruptions} />
        <PhonePlacesBlock anchors={insights.anchors} places={insights.places} />
        <PhoneCorrelationsBlock insights={insights.correlations} />
      </div>
    );
  }
  return (
    <section className="space-y-4" aria-labelledby="oura-phone-signals-title">
      <OuraSectionHeader
        id="oura-phone-signals-title"
        title="Sygnały z telefonu"
        subtitle={insights ? `Dane z ${insights.daysWithData} dni zbierania; każda liczba ma podane źródło i n.` : undefined}
      />
      {body}
    </section>
  );
}
