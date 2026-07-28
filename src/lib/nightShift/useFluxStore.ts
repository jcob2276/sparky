import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FluxState {
  enabled: boolean;
  startTime: string; // "21:00"
  endTime: string;   // "07:00"
  targetTemperature: number; // e.g. 2700 Kelvin
  gradualTransition: boolean; // 30-min fade
  pausedUntil: number | null; // Timestamp (ms) if temporarily paused

  // Actions
  setEnabled: (enabled: boolean) => void;
  setStartTime: (startTime: string) => void;
  setEndTime: (endTime: string) => void;
  setTargetTemperature: (kelvin: number) => void;
  setGradualTransition: (gradual: boolean) => void;
  pauseForMinutes: (minutes: number) => void;
  clearPause: () => void;
  toggleEnabled: () => void;
}

export const useFluxStore = create<FluxState>()(
  persist(
    (set) => ({
      enabled: true,
      startTime: '21:00',
      endTime: '07:00',
      targetTemperature: 2700,
      gradualTransition: true,
      pausedUntil: null,

      setEnabled: (enabled) => set({ enabled }),
      setStartTime: (startTime) => set({ startTime }),
      setEndTime: (endTime) => set({ endTime }),
      setTargetTemperature: (targetTemperature) => set({ targetTemperature }),
      setGradualTransition: (gradualTransition) => set({ gradualTransition }),
      pauseForMinutes: (minutes) => set({ pausedUntil: Date.now() + minutes * 60 * 1000 }),
      clearPause: () => set({ pausedUntil: null }),
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
    }),
    {
      name: 'vanguard_flux_settings_v1',
    }
  )
);
