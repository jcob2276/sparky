import { useHealthspanProfile } from '../../../../lib/healthspanApi';
import { useUserId } from '../../../../store/useStore';
import DataStateNotice from '../../../core/DataStateNotice';
import HealthspanProfilePanel from '../../healthspan/HealthspanProfilePanel';
import HealthspanTrajectoryPanel from '../../healthspan/HealthspanTrajectoryPanel';

/**
 * Healthspan tylko do odczytu: wiek funkcjonalny i trajektoria liczone z danych.
 * Celowo BEZ check-inu, onboardingu i „dźwigni tygodnia” (wymagają wpisów i klikania).
 */
export function DetailsHealthspanReadOnly() {
  const userId = useUserId();
  const profile = useHealthspanProfile(userId);
  if (profile.isLoading) return <DataStateNotice tone="loading" title="Wczytuję Healthspan…" />;
  if (profile.error) {
    return <DataStateNotice tone="warning" title="Healthspan jest chwilowo niedostępny" detail="Odśwież stronę, aby ponowić odczyt." />;
  }
  if (!profile.data) {
    return <p className="text-sm text-text-muted">Healthspan nie jest jeszcze skonfigurowany.</p>;
  }
  return (
    <div className="space-y-5">
      <HealthspanProfilePanel profile={profile.data.profile} pace={profile.data.pace} today={profile.data.today} />
      <HealthspanTrajectoryPanel points={profile.data.history.points} />
    </div>
  );
}
