import { create } from 'zustand';
import type { Alarm, AlarmRingerState } from '../types/alarm';
import { startAlarmSound, stopAlarmSound } from '../lib/alarm/alarmEngine';

const ALARMS_STORAGE_KEY = 'vanguard_alarms_v1';

const DEFAULT_ALARMS: Alarm[] = [
  {
    id: 'alarm-default-1',
    time: '07:00',
    label: 'Poranne Wstawanie',
    enabled: false,
    days: [1, 2, 3, 4, 5], // Mon-Fri
    sound: 'radar',
    volume: 0.8,
    fadeIn: true,
    snoozeLimit: 3,
    snoozeIntervalMinutes: 5,
    snoozedCount: 0,
    mission: {
      type: 'shake',
      config: {
        shakeCount: 20
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'alarm-default-2',
    time: '08:00',
    label: 'Skan Kodu w Kuchni',
    enabled: false,
    days: [0, 6], // Weekend
    sound: 'classic',
    volume: 0.9,
    fadeIn: true,
    snoozeLimit: 2,
    snoozeIntervalMinutes: 5,
    snoozedCount: 0,
    mission: {
      type: 'barcode',
      config: {
        barcodeName: 'Kawa w kuchni',
        barcodeValue: '5900000000000'
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function loadSavedAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
    if (!raw) return DEFAULT_ALARMS;
    const parsed = JSON.parse(raw) as Alarm[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ALARMS;
  } catch (e) {
    console.warn('[useAlarmStore] Failed to parse alarms from localStorage:', e);
    return DEFAULT_ALARMS;
  }
}

function saveAlarms(alarms: Alarm[]) {
  try {
    localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  } catch (e) {
    console.error('[useAlarmStore] Failed to save alarms:', e);
  }
}

interface AlarmStoreState {
  alarms: Alarm[];
  ringer: AlarmRingerState;
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt' | 'snoozedCount'>) => void;
  updateAlarm: (id: string, data: Partial<Alarm>) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  triggerAlarm: (alarm: Alarm) => void;
  dismissRinger: () => void;
  snoozeRinger: () => void;
  checkAlarms: () => void;
}

export const useAlarmStore = create<AlarmStoreState>((set, get) => ({
  alarms: loadSavedAlarms(),
  ringer: {
    activeAlarm: null,
    isRinging: false,
    snoozedUntil: null,
    missionCompleted: false
  },

  addAlarm: (data) => {
    const newAlarm: Alarm = {
      ...data,
      id: `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      snoozedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...get().alarms, newAlarm];
    saveAlarms(updated);
    set({ alarms: updated });
  },

  updateAlarm: (id, data) => {
    const updated = get().alarms.map((item) =>
      item.id === id
        ? { ...item, ...data, updatedAt: new Date().toISOString() }
        : item
    );
    saveAlarms(updated);
    set({ alarms: updated });
  },

  deleteAlarm: (id) => {
    const updated = get().alarms.filter((item) => item.id !== id);
    saveAlarms(updated);
    set({ alarms: updated });
  },

  toggleAlarm: (id) => {
    const updated = get().alarms.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled, snoozedCount: 0 } : item
    );
    saveAlarms(updated);
    set({ alarms: updated });
  },

  triggerAlarm: (alarm) => {
    const currentRinger = get().ringer;
    if (currentRinger.isRinging && currentRinger.activeAlarm?.id === alarm.id) return;

    startAlarmSound(alarm.sound, alarm.volume, alarm.fadeIn);
    set({
      ringer: {
        activeAlarm: alarm,
        isRinging: true,
        snoozedUntil: null,
        missionCompleted: false
      }
    });
  },

  dismissRinger: () => {
    stopAlarmSound();
    const active = get().ringer.activeAlarm;
    if (active) {
      // reset snoozedCount for single-run or repeating
      get().updateAlarm(active.id, { snoozedCount: 0 });
    }
    set({
      ringer: {
        activeAlarm: null,
        isRinging: false,
        snoozedUntil: null,
        missionCompleted: true
      }
    });
  },

  snoozeRinger: () => {
    stopAlarmSound();
    const active = get().ringer.activeAlarm;
    if (!active) return;

    const currentSnoozed = active.snoozedCount || 0;
    if (active.snoozeLimit > 0 && currentSnoozed >= active.snoozeLimit) {
      // Cannot snooze further
      return;
    }

    const snoozeMs = (active.snoozeIntervalMinutes || 5) * 60 * 1000;
    const snoozedUntilDate = new Date(Date.now() + snoozeMs);

    get().updateAlarm(active.id, { snoozedCount: currentSnoozed + 1 });

    set({
      ringer: {
        activeAlarm: null,
        isRinging: false,
        snoozedUntil: snoozedUntilDate.toISOString(),
        missionCompleted: false
      }
    });
  },

  checkAlarms: () => {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay();
    const currentSeconds = now.getSeconds();

    // Trigger only on the 0th second window to avoid repeating inside same minute
    if (currentSeconds > 5) return;

    const { alarms, ringer } = get();

    // Check if snooze timer expired
    if (ringer.snoozedUntil) {
      const snoozeTime = new Date(ringer.snoozedUntil).getTime();
      if (now.getTime() >= snoozeTime) {
        if (ringer.activeAlarm) {
          get().triggerAlarm(ringer.activeAlarm);
          return;
        }
      }
    }

    if (ringer.isRinging) return;

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      if (alarm.days.length > 0 && !alarm.days.includes(currentDay)) continue;

      if (alarm.time === currentHHMM) {
        // Prevent double trigger if triggered within last 60 seconds
        const lastTrig = alarm.updatedAt ? new Date(alarm.updatedAt).getTime() : 0;
        if (now.getTime() - lastTrig < 55000 && ringer.activeAlarm?.id === alarm.id) {
          continue;
        }
        get().triggerAlarm(alarm);
        break;
      }
    }
  }
}));
