import { useOuraBaselines } from './hooks/useOuraBaselines';
import { OuraBaselineRows } from './OuraBaselineRows';

interface OuraBaselineSectionProps {
  userId: string;
  /** Date of the latest night (YYYY-MM-DD, Europe/Warsaw). */
  asOf: string;
}

/** Container: loads the 90-night history and renders "Dziś vs Twoja norma". */
export function OuraBaselineSection({ userId, asOf }: OuraBaselineSectionProps) {
  const { data, isLoading, error } = useOuraBaselines(userId, asOf);
  return <OuraBaselineRows rows={data ?? []} loading={isLoading} errorMessage={error ? error.message : null} />;
}
