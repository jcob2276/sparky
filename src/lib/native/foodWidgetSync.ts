import { registerPlugin } from '@capacitor/core';
import { supabase } from '../supabase';

interface FoodWidgetPlugin {
  getFoodWidgetStatus(): Promise<{ userId: string | null }>;
  setFoodWidgetCredentials(options: { baseUrl: string; userId: string; token: string }): Promise<void>;
  refreshFoodWidgets(): Promise<void>;
}

const WidgetBridge = registerPlugin<FoodWidgetPlugin>('WidgetBridge');

/**
 * Gives the Android food widgets their own revocable token, so they can log meals (photo, scan, text, voice)
 * straight from the home screen without a Supabase session or opening the app.
 */
export function initFoodWidgetSync(userId: string): () => void {
  let cancelled = false;
  void (async () => {
    try {
      const status = await WidgetBridge.getFoodWidgetStatus();
      if (cancelled) return;
      if (status.userId !== userId) {
        const { data, error } = await supabase.functions.invoke<{ token: string; userId: string }>('widget-food', { body: { action: 'register' } });
        if (cancelled || error || !data?.token) return;
        await WidgetBridge.setFoodWidgetCredentials({ baseUrl: import.meta.env.VITE_SUPABASE_URL as string, userId: data.userId, token: data.token });
      }
      await WidgetBridge.refreshFoodWidgets();
    } catch (error) {
      console.debug('[widget] sync skipped', error);
    }
  })();
  return () => { cancelled = true; };
}
