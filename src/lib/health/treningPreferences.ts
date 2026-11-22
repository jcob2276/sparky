/**
 * User-configurable workout settings: sound, haptics, screen wake lock, rest duration.
 * Persisted in localStorage; reactive across hub and logger.
 */

export interface TreningPreferences {
  timerSound: boolean;
  timerVibration: boolean;
  keepAwake: boolean;
  defaultRestSeconds: number;
  plateCalculator: boolean;
}

const DEFAULT_TRENING_PREFERENCES: TreningPreferences = {
  timerSound: true,
  timerVibration: true,
  keepAwake: true,
  defaultRestSeconds: 90,
  plateCalculator: true,
};

const PREFS_KEY = 'sparky_trening_preferences';

export function readTreningPreferences(): TreningPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_TRENING_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_TRENING_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_TRENING_PREFERENCES;
  }
}

export function writeTreningPreferences(prefs: Partial<TreningPreferences>): TreningPreferences {
  try {
    const current = readTreningPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('trening-preferences-changed', { detail: updated }));
    return updated;
  } catch {
    return DEFAULT_TRENING_PREFERENCES;
  }
}

/** Plays a crisp, gentle double-tone bell via Web Audio API. 100% offline, zero network requests. */
export function playTimerCompletionChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Double chime: 587.33 Hz (D5) -> 880 Hz (A5)
    playTone(587.33, now, 0.35);
    playTone(880, now + 0.16, 0.55);
  } catch {
    /* audio blocked or backgrounded */
  }
}
