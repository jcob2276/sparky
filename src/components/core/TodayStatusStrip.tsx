import { Activity, Beef, Dumbbell } from 'lucide-react';
import { GroupedList, GroupedListRow } from '../ui/GroupedList';
import IconTile, { type IconTileTone } from '../ui/IconTile';
import { getTodayStateCopy } from '../../lib/horizonSignals';
import { useDashboardContext } from './context/DashboardContext';

export default function TodayStatusStrip() {
  const { readiness, proteinToday, hasWorkoutToday } = useDashboardContext();
  const metrics: Array<{
    icon: typeof Activity;
    label: string;
    value: string;
    tone: IconTileTone;
  }> = [
    { icon: Activity, label: 'Gotowość', value: readiness > 0 ? `${Math.round(readiness)}` : '—', tone: 'action' },
    { icon: Beef, label: 'Białko', value: `${Math.round(proteinToday)} g`, tone: 'success' },
    { icon: Dumbbell, label: 'Trening', value: hasWorkoutToday ? 'Zrobiony' : 'Przed Tobą', tone: 'attention' },
  ];

  return (
    <section className="space-y-3" aria-labelledby="today-state-title">
      <p id="today-state-title" className="px-1 text-sm leading-relaxed text-text-secondary">
        {getTodayStateCopy(readiness)}
      </p>
      <GroupedList aria-label="Stan dnia">
        {metrics.map(({ icon: Icon, label, value, tone }) => (
          <GroupedListRow key={label} className="flex items-center gap-3 py-2">
            <IconTile icon={<Icon size={19} />} tone={tone} label={label} />
            <span className="min-w-0 flex-1 text-base font-medium text-text-primary">{label}</span>
            <span className="shrink-0 text-sm text-text-secondary">{value}</span>
          </GroupedListRow>
        ))}
      </GroupedList>
    </section>
  );
}
