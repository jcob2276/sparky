/** One row of device_signals_daily (night ending on `date` + the day `date`, Europe/Warsaw). */
export interface DeviceSignalsDailyRow {
  date: string;
  eventCount: number;
  steps: number;
  screenOnMin: number;
  phoneSleepStart: string | null;
  phoneSleepEnd: string | null;
  phoneSleepMin: number | null;
  phoneSleepSteps: number | null;
  phoneSleepCharging: boolean | null;
  phoneSleepConfidence: 'high' | 'medium' | 'low' | null;
  screenAfter22Min: number;
  eveningLuxAvg: number | null;
  eveningBrightnessAvg: number | null;
  eveningLightSamples: number;
  notifTotal: number;
  notifPerHour: number | null;
  notifAwakeHours: number | null;
  notifTop: Record<string, number>;
  homeWifiMin: number;
  workWifiMin: number;
  otherWifiMin: number;
  cellularMin: number;
  offlineMin: number;
}

/** Oura night as stored in oura_enhanced (`date` = the morning the night ended). */
export interface OuraNightRow {
  date: string;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  totalSleepHours: number | null;
  sleepScore: number | null;
}
