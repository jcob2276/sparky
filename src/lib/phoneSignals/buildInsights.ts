import {
  buildPresenceSamples,
  compareSleepSources,
  computeDayPlaceTime,
  computePhoneSleepInsights,
  inferPlaceAnchors,
  summarizeInterruptions,
  type DayPlaceTime,
  type DeviceSignalsDailyRow,
  type InterruptionSummary,
  type LocationRowLike,
  type OuraNightRow,
  type PhoneSleepInsights,
  type PlaceAnchors,
  type SleepSourceComparison,
} from '@vanguard/domain';
import { shiftDateStr } from '../date';

export const PHONE_SIGNALS_WINDOW_DAYS = 45;
const PLACE_DAYS = 7;

export interface PlaceDay {
  date: string;
  place: DayPlaceTime;
}

export interface PhoneSignalsInsights {
  /** Days of the window that have any phone event (the n of the whole feature). */
  daysWithData: number;
  sleep: SleepSourceComparison;
  interruptions: InterruptionSummary;
  anchors: PlaceAnchors;
  places: PlaceDay[];
  correlations: PhoneSleepInsights;
}

/** Pure assembly of every phone-signal view from the aggregate, Oura nights and GPS rows. */
export function buildPhoneSignalsInsights(
  daily: DeviceSignalsDailyRow[],
  oura: OuraNightRow[],
  locations: LocationRowLike[],
  today: string,
): PhoneSignalsInsights {
  const samples = buildPresenceSamples(locations);
  const anchors = inferPlaceAnchors(samples);
  const dailyByDate = new Map(daily.map((d) => [d.date, d]));
  const places: PlaceDay[] = [];
  for (let i = 0; i < PLACE_DAYS; i += 1) {
    const date = shiftDateStr(today, -i);
    places.push({ date, place: computeDayPlaceTime(date, samples, anchors, dailyByDate.get(date) ?? null) });
  }
  return {
    daysWithData: daily.filter((d) => d.eventCount > 0).length,
    sleep: compareSleepSources(daily, oura),
    interruptions: summarizeInterruptions(daily.filter((d) => d.date >= shiftDateStr(today, -13))),
    anchors,
    places,
    correlations: computePhoneSleepInsights(daily, oura),
  };
}
