import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserSettings, useUpdateUserSettings } from '../../hooks/useUserSettings';
import { useSyncActions } from '../../hooks/useSyncActions';
import { useSession } from '../../store/useStore';
import { fetchNutritionProfile, upsertNutritionProfile } from '../../lib/userSettingsApi';
import { userSettingsKeys } from '../../lib/queryKeys';
import { invalidateLifeTargets } from '../../lib/lifeTargetsApi';
import { notify } from '../../lib/notify';
import type { Tables } from '../../lib/database.types';

export function useSettingsForm() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id ?? '';
  const { data: userSettings } = useUserSettings(userId);
  const updateSettingsMutation = useUpdateUserSettings();
  const [form, setForm] = useState<Partial<Tables<'user_settings'>>>({});
  const [profile, setProfile] = useState<Partial<Tables<'nutrition_profile'>>>({});
  const [saving, setSaving] = useState(false);

  const { syncCalendar, startGoogleAuth } = useSyncActions({
    userId,
    accessToken: session?.access_token ?? '',
    onRefresh: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: userSettingsKeys.detail(userId) });
    },
    setSyncing: () => {},
  });

  useEffect(() => {
    if (userSettings) void (async () => { setForm(userSettings); })();
  }, [userSettings]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await fetchNutritionProfile(userId);
        if (data) setProfile(data);
      } catch (err: unknown) {
        console.error('[SettingsView] Failed to load profile:', err);
      }
    }
    if (userId) void loadProfile();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        user_id: userId,
        oura_token: form.oura_token || null,
        home_lat: form.home_lat ?? null,
        home_lng: form.home_lng ?? null,
        updated_at: new Date().toISOString(),
      });
      await upsertNutritionProfile({
        user_id: userId,
        birth_date: profile.birth_date || null,
        sex: profile.sex || null,
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        goal_body_fat: profile.goal_body_fat ? Number(profile.goal_body_fat) : null,
        goal_target_date: profile.goal_target_date || null,
        protein_g_per_kg: profile.protein_g_per_kg ? Number(profile.protein_g_per_kg) : 2.0,
        weekly_loss_kg: profile.weekly_loss_kg ? Number(profile.weekly_loss_kg) : 0.5,
        updated_at: new Date().toISOString(),
      });
      invalidateLifeTargets(queryClient, userId);
      notify('Ustawienia zapisane.', 'success');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Błąd zapisu', 'error');
    } finally {
      setSaving(false);
    }
  };

  return { session, form, setForm, profile, setProfile, saving, save, syncCalendar, startGoogleAuth };
}
