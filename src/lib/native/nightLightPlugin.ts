import { registerPlugin } from '@capacitor/core';

interface NightLightNativePlugin {
  setSystemOverlayFilter(options: { enabled: boolean; color?: string; alpha?: number }): Promise<{ success: boolean }>;
}

const NightLightNative = registerPlugin<NightLightNativePlugin>('NightLight');

export async function toggleSystemOverlayFilter(enabled: boolean, color: string = '#FF8C00', alpha: number = 0.35): Promise<boolean> {
  try {
    const res = await NightLightNative.setSystemOverlayFilter({ enabled, color, alpha });
    return res.success;
  } catch (err: unknown) {
    console.warn('[nightLightPlugin] setSystemOverlayFilter error:', err);
    return false;
  }
}
