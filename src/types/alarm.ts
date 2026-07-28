export type MissionType = 'none' | 'shake' | 'barcode' | 'math' | 'memory' | 'typing';

export type MathDifficulty = 'easy' | 'medium' | 'hard';

export interface MissionConfig {
  shakeCount?: number;
  barcodeValue?: string;
  barcodeName?: string;
  mathDifficulty?: MathDifficulty;
  mathCount?: number;
  memoryGridSize?: number;
  typingPhrase?: string;
}

export interface Alarm {
  id: string;
  time: string; // "HH:MM" 24h format
  label: string;
  enabled: boolean;
  days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  sound: string; // e.g. 'radar' | 'classic' | 'chime' | 'digital'
  volume: number; // 0.1 to 1.0
  fadeIn: boolean; // gradual volume rise
  snoozeLimit: number; // 0 = disabled, 1..5
  snoozeIntervalMinutes: number; // e.g. 5
  snoozedCount: number;
  mission: {
    type: MissionType;
    config: MissionConfig;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AlarmRingerState {
  activeAlarm: Alarm | null;
  isRinging: boolean;
  snoozedUntil: string | null;
  missionCompleted: boolean;
}
