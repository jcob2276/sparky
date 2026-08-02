/**
 * Web Audio API & Vibration alarm sound engine.
 * Generates reliable synthesized alarm ringers locally without external network dependencies.
 */

let audioCtx: AudioContext | null = null;
let oscillatorInterval: number | null = null;
let vibrationInterval: number | null = null;
let currentGainNode: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playBeepSequence(type: string, targetVolume: number) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  currentGainNode = gain;

  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(targetVolume, now + 0.05);

  if (type === 'classic') {
    // High alert dual tone
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1760, now + 0.15); // A6
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.stop(now + 0.35);
  } else if (type === 'digital') {
    // Triple fast beep
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.stop(now + 0.12);
  } else if (type === 'chime') {
    // Soft harmonic bell sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.2); // E5
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.stop(now + 0.8);
  } else {
    // Default Radar sweep
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.stop(now + 0.4);
  }
}

export function startAlarmSound(soundType: string = 'radar', volume: number = 0.8, fadeIn: boolean = true) {
  stopAlarmSound();

  let currentVol = fadeIn ? 0.1 : volume;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  // Sound loop interval
  playBeepSequence(soundType, currentVol);
  const intervalMs = soundType === 'chime' ? 1200 : soundType === 'digital' ? 500 : 700;

  oscillatorInterval = window.setInterval(() => {
    if (fadeIn && currentVol < volume) {
      currentVol = Math.min(volume, currentVol + 0.05);
    }
    playBeepSequence(soundType, currentVol);
  }, intervalMs);

  // Vibration loop
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([600, 300, 600, 300]);
      vibrationInterval = window.setInterval(() => {
        navigator.vibrate([600, 300, 600, 300]);
      }, 2000);
    } catch (e) {
      console.warn('[alarmEngine] Vibration API error or blocked:', e);
    }
  }
}

export function stopAlarmSound() {
  if (oscillatorInterval !== null) {
    clearInterval(oscillatorInterval);
    oscillatorInterval = null;
  }
  if (vibrationInterval !== null) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
  if (currentGainNode && audioCtx) {
    try {
      currentGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    } catch {
      // ignore
    }
  }
}
