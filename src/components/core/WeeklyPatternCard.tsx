import { Lightbulb, ArrowRight } from 'lucide-react';
import { getTodayWarsaw, getWeekStartWarsaw } from '../../lib/date';
import { patternMeta, pickWeeklyPattern } from '../../lib/weeklyPattern';
import { useCorrelationsData } from '../correlations/hooks/useCorrelationsData';
import { Pressable } from '../ui/ControlPrimitives';
import { useDashboardContext } from './context/DashboardContext';
import WeeklyCollapsible from './WeeklyCollapsible';

/** Jedna sprawdzona zależność z Twoich danych na tydzień; nic nie pokazuje, dopóki żadna nie ma dość dowodów. */
export default function WeeklyPatternCard() {
  const dashboard = useDashboardContext();
  const { strongSignals, loading } = useCorrelationsData();
  const pattern = pickWeeklyPattern(strongSignals, getWeekStartWarsaw(getTodayWarsaw()));
  if (loading || !pattern) return null;

  return (
    <WeeklyCollapsible
      icon={<Lightbulb size={12} className="text-primary" />}
      title="Zależność tygodnia"
      summary={pattern.natural_effect}
    >
      <p className="text-sm font-semibold leading-snug text-text-primary">{pattern.natural_effect}</p>
      <p className="text-xs text-text-secondary">{patternMeta(pattern)}</p>
      <p className="text-2xs text-text-muted">To wzór z Twoich danych, a nie dowód przyczyny. Traktuj go jako wskazówkę do sprawdzenia.</p>
      <Pressable
        type="button"
        onClick={() => dashboard.navigate('/korelacje')}
        className="flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary active:scale-95"
      >
        Wszystkie zależności <ArrowRight size={13} aria-hidden="true" />
      </Pressable>
    </WeeklyCollapsible>
  );
}
