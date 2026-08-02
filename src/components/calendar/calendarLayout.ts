import { type CalRow } from './calendarHelpers';
import { computeEventColumns } from '../../lib/appleCalendar/appleEventLayoutEngine';

export function layoutDayEvents(dayEvents: CalRow[]) {
  const positioned = computeEventColumns(dayEvents);
  const styles = new Map<string, { left: string; width: string }>();

  positioned.forEach((item) => {
    styles.set(item.id, {
      left: `${item.leftPercent}%`,
      width: `${item.widthPercent}%`,
    });
  });

  return styles;
}
