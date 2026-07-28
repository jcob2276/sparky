import { registerPlugin } from '@capacitor/core';

export interface NightLightNativePlugin {
  hasSecureSettingsPermission(): Promise<{ granted: boolean }>;
  setSystemNightLight(options: { enabled: boolean }): Promise<{ success: boolean }>;
  setSystemOverlayFilter(options: { enabled: boolean; color?: string; alpha?: number }): Promise<{ success: boolean }>;
  hasOverlayPermission(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<void>;
}

const NightLightNative = registerPlugin<NightLightNativePlugin>('NightLight');

export async function checkSecureSettingsPermission(): Promise<boolean> {
  try {
    const res = await NightLightNative.hasSecureSettingsPermission();
    return res.granted;
  } catch {
    return false;
  }
}

export async function toggleSystemNightLight(enabled: boolean): Promise<boolean> {
  try {
    const res = await NightLightNative.setSystemNightLight({ enabled });
    return res.success;
  } catch {
    return false;
  }
}

export async function toggleSystemOverlayFilter(enabled: boolean, color: string = '#FF8C00', alpha: number = 0.35): Promise<boolean> {
  try {
    const res = await NightLightNative.setSystemOverlayFilter({ enabled, color, alpha });
    return res.success;
  } catch (err: unknown) {
    console.warn('[nightLightPlugin] setSystemOverlayFilter error:', err);
    return false;
  }
}

export async function checkOverlayPermission(): Promise<boolean> {
  try {
    const res = await NightLightNative.hasOverlayPermission();
    return res.granted;
  } catch {
    return false;
  }
}

export async function requestOverlayPermission(): Promise<void> {
  try {
    await NightLightNative.requestOverlayPermission();
  } catch {
    /* No-op on web */
  }
}
