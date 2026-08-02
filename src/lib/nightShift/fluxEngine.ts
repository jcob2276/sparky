/**
 * f.lux / Anti-Blue Light Engine
 * Calculates color temperature matrices and time schedule intensity.
 */

interface FluxSchedule {
  startTime: string; // "HH:MM" e.g. "21:00"
  endTime: string;   // "HH:MM" e.g. "07:00"
  gradualRampMinutes?: number; // default 30 mins
}

export interface RGBMatrix {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts a Kelvin color temperature (1000K - 6500K) into RGB matrix scaling factors.
 * 6500K = Neutral Daylight (1.0, 1.0, 1.0)
 * 2700K = Warm Incandescent Sunset (~1.0, 0.80, 0.40)
 * 1900K = Candlelight Amber (~1.0, 0.68, 0.18)
 * 1200K = Deep Bedtime Spectrum (~1.0, 0.52, 0.04)
 */
export function kelvinToRGBMatrix(kelvin: number): RGBMatrix {
  const k = Math.max(1000, Math.min(6500, kelvin));
  if (k >= 6500) {
    return { r: 1.0, g: 1.0, b: 1.0 };
  }
  // Pure Red Subpixel Mode (1000K Bedtime Spectrum - 0% Blue, 0% Green)
  if (k <= 1000) {
    return { r: 1.0, g: 0.0, b: 0.0 };
  }

  // Tanner Helland algorithm tuned for screen color matrix display
  const temp = k / 100;

  // Red
  const r = 1.0;

  // Green
  let g: number;
  if (temp <= 66) {
    g = (99.4708025861 * Math.log(temp) - 161.1195681661) / 255;
  } else {
    g = (288.1221695283 * Math.pow(temp - 60, -0.0755148492)) / 255;
  }
  g = Math.max(0.3, Math.min(1.0, g));

  // Blue
  let b: number;
  if (temp >= 66) {
    b = 1.0;
  } else if (temp <= 19) {
    // Below 1900K, aggressively attenuate blue light
    b = Math.max(0.0, (temp - 10) * 0.02);
  } else {
    b = (138.5177312231 * Math.log(temp - 10) - 305.0447927307) / 255;
  }
  b = Math.max(0.0, Math.min(1.0, b));

  return {
    r: Number(r.toFixed(3)),
    g: Number(g.toFixed(3)),
    b: Number(b.toFixed(3)),
  };
}

/**
 * Returns an SVG feColorMatrix string format for the given RGB matrix & intensity.
 */
export function getSVGColorMatrixString(matrix: RGBMatrix, intensity = 1.0): string {
  const clampedIntensity = Math.max(0, Math.min(1, intensity));

  // Interpolate between neutral (1, 1, 1) and target matrix based on intensity
  const rScale = (1 - clampedIntensity) + matrix.r * clampedIntensity;
  const gScale = (1 - clampedIntensity) + matrix.g * clampedIntensity;
  const bScale = (1 - clampedIntensity) + matrix.b * clampedIntensity;

  return [
    `${rScale.toFixed(3)} 0 0 0 0`,
    `0 ${gScale.toFixed(3)} 0 0 0`,
    `0 0 ${bScale.toFixed(3)} 0 0`,
    `0 0 0 1 0`
  ].join(' ');
}

/**
 * Helper to parse "HH:MM" string into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates current active status and ramping factor (0.0 to 1.0) for a given date and schedule.
 */
export function calculateFluxIntensity(
  now: Date,
  startTime: string,
  endTime: string,
  gradualRampMinutes = 30
): { isActive: boolean; intensity: number } {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  const rampMins = Math.max(0, gradualRampMinutes);

  let isNightWindow = false;
  if (startMins > endMins) {
    // Spans midnight (e.g. 21:00 to 07:00)
    isNightWindow = currentMinutes >= startMins || currentMinutes < endMins;
  } else {
    // Same day window (e.g. 20:00 to 23:00)
    isNightWindow = currentMinutes >= startMins && currentMinutes < endMins;
  }

  if (isNightWindow) {
    // Check if we are in the initial ramping phase right after startTime
    let minutesIntoPeriod = 0;
    if (startMins > endMins) {
      minutesIntoPeriod = currentMinutes >= startMins
        ? currentMinutes - startMins
        : (24 * 60 - startMins) + currentMinutes;
    } else {
      minutesIntoPeriod = currentMinutes - startMins;
    }

    if (rampMins > 0 && minutesIntoPeriod < rampMins) {
      const intensity = Math.min(1.0, minutesIntoPeriod / rampMins);
      return { isActive: true, intensity };
    }

    return { isActive: true, intensity: 1.0 };
  }

  // Check pre-ramp phase before startTime if gradual transition is enabled
  if (rampMins > 0) {
    const preRampStartMins = (startMins - rampMins + 24 * 60) % (24 * 60);
    let isInPreRamp = false;
    if (preRampStartMins < startMins) {
      isInPreRamp = currentMinutes >= preRampStartMins && currentMinutes < startMins;
    } else {
      isInPreRamp = currentMinutes >= preRampStartMins || currentMinutes < startMins;
    }

    if (isInPreRamp) {
      const minutesInPreRamp = currentMinutes >= preRampStartMins
        ? currentMinutes - preRampStartMins
        : (24 * 60 - preRampStartMins) + currentMinutes;
      const intensity = Math.min(1.0, minutesInPreRamp / rampMins);
      return { isActive: true, intensity };
    }
  }

  return { isActive: false, intensity: 0.0 };
}
