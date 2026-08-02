import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface NativeStylusPoint {
  x: number;
  y: number;
  pressure: number;
  tilt: number;
  orientation: number;
  time: number;
}

interface NativeStylusEvent {
  action: 'down' | 'move' | 'up' | 'cancel';
  eraser: boolean;
  buttonState: number;
  points: NativeStylusPoint[];
}

interface StylusInputPluginContract {
  start(): Promise<{ density: number }>;
  stop(): Promise<void>;
  addListener(eventName: 'stylusEvent', listener: (event: NativeStylusEvent) => void): Promise<PluginListenerHandle>;
}

export const StylusInput = registerPlugin<StylusInputPluginContract>('StylusInput');
