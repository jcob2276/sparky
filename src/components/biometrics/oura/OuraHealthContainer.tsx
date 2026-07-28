import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDailyStrainOura,
  useOuraContext,
  useOuraHistory30Days,
  useOuraNightDetails,
} from '../../../lib/biometricsApi';
import { shiftDateStr } from '../../../lib/date';
import { useCorrelationsQuery } from '../../../lib/correlationsApi';
import { useUserId } from '../../../store/useStore';
import { OuraHealthView, type OuraSection } from './OuraHealthView';

export function OuraHealthContainer() {
  const navigate = useNavigate();
  const userId = useUserId();
  const [activeSection, setActiveSection] = useState<OuraSection>('today');
  const [sleepOpen, setSleepOpen] = useState(false);
  const dailyQuery = useDailyStrainOura(userId ?? '');
  const historyQuery = useOuraHistory30Days(userId ?? '');
  const correlationsQuery = useCorrelationsQuery(userId, false);
  const nightQuery = useOuraNightDetails(
    userId ?? '',
    dailyQuery.data?.date ?? null,
    dailyQuery.data?.enhanced?.bedtime_start ?? null,
    dailyQuery.data?.enhanced?.bedtime_end ?? null,
  );
  const selectedDate = dailyQuery.data?.date ?? null;
  const todayContextQuery = useOuraContext(
    userId ?? '',
    selectedDate,
    null,
  );
  const nightContextQuery = useOuraContext(
    userId ?? '',
    selectedDate ? shiftDateStr(selectedDate, -1) : null,
    dailyQuery.data?.enhanced?.bedtime_start ?? null,
  );

  if (!userId) return null;

  const data = {
    date: dailyQuery.data?.date ?? null,
    strainRow: dailyQuery.data?.row ?? null,
    oura: dailyQuery.data?.oura ?? null,
    ouraYesterday: dailyQuery.data?.ouraYesterday ?? null,
    enhanced: dailyQuery.data?.enhanced ?? null,
    enhancedYesterday: dailyQuery.data?.enhancedYesterday ?? null,
    ouraHistory: historyQuery.data?.ouraHistory ?? [],
    enhancedHistory: historyQuery.data?.enhancedHistory ?? [],
    birthDateStr: dailyQuery.data?.birthDateStr ?? null,
    garminVo2Max: dailyQuery.data?.garminVo2Max ?? null,
    externalVo2Source: dailyQuery.data?.externalVo2Source ?? null,
    nightDetails: nightQuery.data ?? null,
    todayContext: todayContextQuery.data ?? null,
    nightContext: nightContextQuery.data ?? null,
    correlations: correlationsQuery.data ?? null,
  };

  return (
    <OuraHealthView
      activeSection={activeSection}
      data={data}
      isLoading={dailyQuery.isLoading || historyQuery.isLoading || nightQuery.isLoading || todayContextQuery.isLoading || nightContextQuery.isLoading}
      onExit={() => navigate(-1)}
      onOpenSleep={() => setSleepOpen(true)}
      onSectionChange={setActiveSection}
      onSleepClose={() => setSleepOpen(false)}
      sleepOpen={sleepOpen}
    />
  );
}
