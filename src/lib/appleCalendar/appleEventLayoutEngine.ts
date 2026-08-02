/**
 * @module appleEventLayoutEngine
 * @role Implements Apple Calendar's multi-column event layout algorithm (`EKEventLayout`):
 *       - Detects overlapping event time intervals using Apple `DateInterval.intersects`
 *       - Groups overlapping events into visual collision clusters
 *       - Assigns column indices and column spans so overlapping events render in side-by-side columns
 *         without covering each other
 */

import { DateInterval, createDateInterval, intervalsIntersect } from './appleDateInterval';
import { parseTime, type CalRow } from '../../components/calendar/calendarHelpers';

export interface PositionedCalRow extends CalRow {
  columnIndex: number;
  totalColumns: number;
  leftPercent: number;
  widthPercent: number;
}

/**
 * Computes side-by-side column positioning for an array of events occurring on a single day.
 * Implements Apple Calendar EKEventLayout stacking algorithm.
 */
export function computeEventColumns(events: CalRow[]): PositionedCalRow[] {
  if (events.length === 0) return [];

  // Filter events with valid start and end times
  const validEvents = events.filter((ev) => ev.start_time && ev.end_time);
  if (validEvents.length === 0) return [];

  // Sort events by start time, then by longest duration
  const sorted = [...validEvents].sort((a, b) => {
    const startA = parseTime(a.start_time!);
    const startB = parseTime(b.start_time!);
    if (startA !== startB) return startA - startB;

    const durA = parseTime(a.end_time!) - startA;
    const durB = parseTime(b.end_time!) - startB;
    return durB - durA; // Longest first
  });

  // Convert to DateIntervals
  const intervalsMap = new Map<string, DateInterval>();
  sorted.forEach((ev) => {
    intervalsMap.set(ev.id, createDateInterval(ev.start_time!, ev.end_time!));
  });

  // Group events into overlapping collision clusters
  const clusters: CalRow[][] = [];
  let currentCluster: CalRow[] = [];
  let currentClusterEnd = 0;

  sorted.forEach((ev) => {
    const endMin = parseTime(ev.end_time!);
    const startMin = parseTime(ev.start_time!);

    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      currentClusterEnd = endMin;
    } else if (startMin < currentClusterEnd) {
      currentCluster.push(ev);
      currentClusterEnd = Math.max(currentClusterEnd, endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      currentClusterEnd = endMin;
    }
  });

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  const result: PositionedCalRow[] = [];

  clusters.forEach((cluster) => {
    const columns: CalRow[][] = [];

    cluster.forEach((ev) => {
      const evInterval = intervalsMap.get(ev.id)!;
      let placed = false;

      // Find first column where ev does not intersect with the last event in that column
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lastEvInCol = columns[colIdx][columns[colIdx].length - 1];
        const lastInterval = intervalsMap.get(lastEvInCol.id)!;

        if (!intervalsIntersect(evInterval, lastInterval)) {
          columns[colIdx].push(ev);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([ev]);
      }
    });

    const totalColumns = columns.length;

    columns.forEach((colEvents, colIdx) => {
      colEvents.forEach((ev) => {
        const leftPercent = (colIdx / totalColumns) * 100;
        const widthPercent = (1 / totalColumns) * 100;

        result.push({
          ...ev,
          columnIndex: colIdx,
          totalColumns,
          leftPercent,
          widthPercent,
        });
      });
    });
  });

  return result;
}
