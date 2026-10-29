/**
 * Runtime detection for Capacitor vs browser PWA.
 * PWA path must never call native-only APIs without this guard.
 */
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}
