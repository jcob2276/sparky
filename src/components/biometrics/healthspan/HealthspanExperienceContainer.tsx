import {
  useDecideHealthspanLever,
  useSaveHealthspanCheckin,
  useSaveHealthspanOnboarding,
} from '../../../lib/healthspanCheckinsApi';
import { useHealthspanProfile } from '../../../lib/healthspanApi';
import { notify } from '../../../lib/notify';
import { useUserId } from '../../../store/useStore';
import HealthspanCheckInPanel from './HealthspanCheckInPanel';
import HealthspanLeversPanel from './HealthspanLeversPanel';
import HealthspanProfilePanel from './HealthspanProfilePanel';
import HealthspanOnboardingPanel from './HealthspanOnboardingPanel';
import HealthspanTrajectoryPanel from './HealthspanTrajectoryPanel';

export default function HealthspanExperienceContainer() {
  const userId = useUserId();
  const profile = useHealthspanProfile(userId);
  const checkin = useSaveHealthspanCheckin(userId);
  const onboarding = useSaveHealthspanOnboarding(userId);
  const leverDecision = useDecideHealthspanLever(userId);
  if (profile.isLoading) return null;
  if (!profile.data) {
    return (
      <HealthspanOnboardingPanel
        saving={onboarding.isPending}
        onSave={(input) => onboarding.mutate(input, {
          onSuccess: () => notify('Profil Healthspan utworzony.', 'success'),
          onError: () => notify('Nie udało się utworzyć profilu.', 'error'),
        })}
      />
    );
  }
  return (
    <div className="space-y-5">
      <HealthspanProfilePanel
        profile={profile.data.profile}
        pace={profile.data.pace}
        today={profile.data.today}
      />
      <HealthspanTrajectoryPanel points={profile.data.history.points} />
      <HealthspanLeversPanel
        levers={profile.data.levers}
        onDecision={(id, status) => leverDecision.mutate(
          { id, status },
          {
            onSuccess: () => notify('Dźwignia zaktualizowana.', 'success'),
            onError: () => notify('Nie udało się zapisać decyzji.', 'error'),
          },
        )}
      />
      <HealthspanCheckInPanel
        saving={checkin.isPending}
        onSave={(period, payload) => checkin.mutate(
          { period, payload },
          {
            onSuccess: () => notify('Check-in zapisany.', 'success'),
            onError: () => notify('Nie udało się zapisać check-inu.', 'error'),
          },
        )}
      />
    </div>
  );
}
