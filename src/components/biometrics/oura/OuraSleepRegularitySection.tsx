import { OuraSleepRegularity } from './OuraSleepRegularity';
import { useSleepRegularityData } from './hooks/useSleepRegularityData';

/** Fetches the last two weeks of nights and renders the regularity chart. */
export function OuraSleepRegularitySection({ userId }: { userId: string }) {
  const query = useSleepRegularityData(userId);
  return (
    <section className="space-y-4" aria-label="Regularność snu">
      <p className="text-sm leading-6 text-text-secondary">
        Stała pora snu to jeden z najsilniejszych czynników regeneracji.
      </p>
      <OuraSleepRegularity data={query.data} loading={query.isLoading} error={query.error?.message} />
    </section>
  );
}
