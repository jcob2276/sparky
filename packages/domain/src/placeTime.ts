import { formatWarsawDate, isWarsawWeekend, warsawTimeOfDay } from './date.ts';
import { haversineDistanceMeters } from './location.ts';

/** One stretch of presence: a GPS visit (weight = dwell) or a heartbeat point (weight = time to next point). */
export interface PresenceSample {
  atMs: number;
  lat: number;
  lng: number;
  minutes: number;
}

export interface LocationRowLike {
  created_at: string;
  latitude: number;
  longitude: number;
  kind: string | null;
  dwell_seconds: number | null;
}

export interface PlaceAnchor {
  lat: number;
  lng: number;
}

export interface PlaceAnchors {
  home: PlaceAnchor | null;
  work: PlaceAnchor | null;
  /** Distinct nights / weekdays that back the guess (the n shown in the UI). */
  homeNights: number;
  workDays: number;
}

export interface DayWifiMinutes {
  homeWifiMin: number;
  workWifiMin: number;
  otherWifiMin: number;
  cellularMin: number;
  offlineMin: number;
}

export type PlaceSource = 'gps+wifi' | 'gps' | 'wifi' | 'none';

export interface DayPlaceTime {
  homeMin: number | null;
  workMin: number | null;
  awayMin: number | null;
  source: PlaceSource;
  /** GPS samples behind the day. */
  gpsSamples: number;
}

const CLUSTER_RADIUS_M = 150;
const NEAR_ANCHOR_M = 200;
const MAX_POINT_WEIGHT_MIN = 30;
const MIN_ANCHOR_DAYS = 3;
const MIN_ANCHOR_MINUTES = 120;
const MIN_GPS_COVERAGE_MIN = 60;

/** Merges visits and heartbeat points into weighted presence samples (visits win over nearby points). */
export function buildPresenceSamples(rows: LocationRowLike[]): PresenceSample[] {
  const samples: PresenceSample[] = [];
  const points = rows
    .filter((r) => r.kind !== 'visit')
    .map((r) => ({ ms: new Date(r.created_at).getTime(), lat: r.latitude, lng: r.longitude }))
    .filter((p) => Number.isFinite(p.ms))
    .sort((a, b) => a.ms - b.ms);
  for (let i = 0; i < points.length; i += 1) {
    const next = i + 1 < points.length ? points[i + 1].ms : points[i].ms;
    const gapMin = (next - points[i].ms) / 60_000;
    samples.push({
      atMs: points[i].ms,
      lat: points[i].lat,
      lng: points[i].lng,
      minutes: Math.min(MAX_POINT_WEIGHT_MIN, Math.max(5, gapMin)),
    });
  }
  const visitIntervals: Array<[number, number]> = [];
  for (const r of rows) {
    if (r.kind !== 'visit' || !r.dwell_seconds) continue;
    const start = new Date(r.created_at).getTime();
    if (!Number.isFinite(start)) continue;
    const end = start + r.dwell_seconds * 1000;
    visitIntervals.push([start, end]);
    samples.push({ atMs: start + (end - start) / 2, lat: r.latitude, lng: r.longitude, minutes: r.dwell_seconds / 60 });
  }
  // a heartbeat point inside a visit is already counted by the visit
  return samples.filter(
    (s) => s.minutes > MAX_POINT_WEIGHT_MIN || !visitIntervals.some(([a, b]) => s.atMs >= a && s.atMs <= b),
  );
}

interface Cluster {
  lat: number;
  lng: number;
  minutes: number;
}

function clusterSamples(samples: PresenceSample[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const s of samples) {
    const hit = clusters.find((c) => haversineDistanceMeters(s.lat, s.lng, c.lat, c.lng) <= CLUSTER_RADIUS_M);
    if (hit) {
      const total = hit.minutes + s.minutes;
      hit.lat = (hit.lat * hit.minutes + s.lat * s.minutes) / total;
      hit.lng = (hit.lng * hit.minutes + s.lng * s.minutes) / total;
      hit.minutes = total;
    } else {
      clusters.push({ lat: s.lat, lng: s.lng, minutes: s.minutes });
    }
  }
  return clusters;
}

function warsawHour(ms: number): number {
  return Number(warsawTimeOfDay(new Date(ms).toISOString()).slice(0, 2));
}

function bestCluster(
  samples: PresenceSample[],
  exclude: PlaceAnchor | null,
): { anchor: PlaceAnchor; days: number } | null {
  const clusters = clusterSamples(samples).filter(
    (c) => !exclude || haversineDistanceMeters(c.lat, c.lng, exclude.lat, exclude.lng) > NEAR_ANCHOR_M,
  );
  clusters.sort((a, b) => b.minutes - a.minutes);
  const top = clusters[0];
  if (!top || top.minutes < MIN_ANCHOR_MINUTES) return null;
  const days = new Set(
    samples
      .filter((s) => haversineDistanceMeters(s.lat, s.lng, top.lat, top.lng) <= CLUSTER_RADIUS_M * 1.5)
      .map((s) => formatWarsawDate(s.atMs)),
  );
  return days.size >= MIN_ANCHOR_DAYS ? { anchor: { lat: top.lat, lng: top.lng }, days: days.size } : null;
}

/** Home = where you are most at night (00-06), work = the other place you dwell on weekdays 09-16. */
export function inferPlaceAnchors(samples: PresenceSample[]): PlaceAnchors {
  const night = samples.filter((s) => warsawHour(s.atMs) < 6);
  const home = bestCluster(night, null);
  const workHours = samples.filter((s) => {
    const h = warsawHour(s.atMs);
    return h >= 9 && h < 16 && !isWarsawWeekend(new Date(s.atMs));
  });
  const work = bestCluster(workHours, home?.anchor ?? null);
  return {
    home: home?.anchor ?? null,
    work: work?.anchor ?? null,
    homeNights: home?.days ?? 0,
    workDays: work?.days ?? 0,
  };
}

/**
 * Home / work / away minutes for one Warsaw day. GPS decides when it covers the day; Wi-Fi labels
 * (home/work) keep working with GPS off and act as a lower bound for time at those places.
 */
export function computeDayPlaceTime(
  date: string,
  samples: PresenceSample[],
  anchors: PlaceAnchors,
  wifi: DayWifiMinutes | null,
): DayPlaceTime {
  const day = samples.filter((s) => formatWarsawDate(s.atMs) === date);
  let gpsHome = 0;
  let gpsWork = 0;
  let gpsAway = 0;
  for (const s of day) {
    if (anchors.home && haversineDistanceMeters(s.lat, s.lng, anchors.home.lat, anchors.home.lng) <= NEAR_ANCHOR_M) {
      gpsHome += s.minutes;
    } else if (anchors.work && haversineDistanceMeters(s.lat, s.lng, anchors.work.lat, anchors.work.lng) <= NEAR_ANCHOR_M) {
      gpsWork += s.minutes;
    } else {
      gpsAway += s.minutes;
    }
  }
  const gpsTotal = gpsHome + gpsWork + gpsAway;
  const gpsUsable = anchors.home !== null && gpsTotal >= MIN_GPS_COVERAGE_MIN;
  const wifiObserved = wifi ? wifi.homeWifiMin + wifi.workWifiMin + wifi.otherWifiMin + wifi.cellularMin + wifi.offlineMin : 0;
  const wifiUsable = wifi !== null && wifiObserved >= MIN_GPS_COVERAGE_MIN && wifi.homeWifiMin + wifi.workWifiMin > 0;

  if (gpsUsable && wifi) {
    const homeMin = Math.max(Math.round(gpsHome), wifi.homeWifiMin);
    const workMin = Math.max(Math.round(gpsWork), wifi.workWifiMin);
    const awayMin = Math.max(0, Math.round(gpsTotal) - homeMin - workMin);
    return { homeMin, workMin, awayMin, source: 'gps+wifi', gpsSamples: day.length };
  }
  if (gpsUsable) {
    return { homeMin: Math.round(gpsHome), workMin: Math.round(gpsWork), awayMin: Math.round(gpsAway), source: 'gps', gpsSamples: day.length };
  }
  if (wifi && wifiUsable) {
    return {
      homeMin: wifi.homeWifiMin,
      workMin: wifi.workWifiMin,
      awayMin: Math.max(0, wifiObserved - wifi.homeWifiMin - wifi.workWifiMin),
      source: 'wifi',
      gpsSamples: day.length,
    };
  }
  return { homeMin: null, workMin: null, awayMin: null, source: 'none', gpsSamples: day.length };
}
