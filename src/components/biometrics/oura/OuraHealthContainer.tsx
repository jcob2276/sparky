import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDailyStrainOura,
  useOuraContext,
  useOuraHistory30Days,
  useOuraNightDetails,
} from '../../../lib/biometricsApi';
import { shiftDateStr } from '../../../lib/date';
import { useCorrelationsQuery } from '../../../lib/correlationsApi';
import { useUserId } from '../../../store/useStore';
import { OuraHealthView } from './OuraHealthView';
import type { DetailsAnchor, OuraSection } from './ouraTabs';
import { useSleepDrivers } from '../../../lib/biometrics/sleepDrivers/useSleepDrivers';
import { syncOura, computeDailyStrain } from '../../../lib/syncApi';
import { notify } from '../../../lib/notify';
import { biometricsKeys } from '../../../lib/queryKeys';

export function OuraHealthContainer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const [activeSection, setActiveSection] = useState<OuraSection>('today');
  const [detailsAnchor, setDetailsAnchor] = useState<DetailsAnchor | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);

  const drivers = useSleepDrivers(userId);
  const dailyQuery = useDailyStrainOura(userId ?? '');
  const historyQuery = useOuraHistory30Days(userId ?? '');
  const correlationsQuery = useCorrelationsQuery(userId, false);
  const selectedDate = dailyQuery.data?.date ?? null;
  const nightQuery = useOuraNightDetails(
    userId ?? '',
    selectedDate,
    dailyQuery.data?.enhanced?.bedtime_start ?? null,
    dailyQuery.data?.enhanced?.bedtime_end ?? null,
  );
  const nightContextQuery = useOuraContext(
    userId ?? '',
    selectedDate ? shiftDateStr(selectedDate, -1) : null,
    dailyQuery.data?.enhanced?.bedtime_start ?? null,
  );

  const handleSync = async () => {
    if (isSyncing || !userId) return;
    setIsSyncing(true);
    let syncSucceeded = false;
    try {
      await syncOura(userId);
      syncSucceeded = true;
      try {
        await computeDailyStrain(userId, 2);
      } finally {
        await queryClient.invalidateQueries({ queryKey: biometricsKeys.all });
      }
      notify('Pomiary Oura zsynchronizowane', 'success');
    } catch (err) {
      console.error('[OuraHealthContainer] sync failed:', err);
      if (syncSucceeded) {
        notify('Pomiary Oura pobrane; nie udało się przeliczyć obciążenia', 'error');
      } else {
        notify('Nie udało się zsynchronizować Oura', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (!userId) return null;

  const data = {
    sourceErrors: [
      ...(dailyQuery.data?.sourceErrors ?? []),
      ...(historyQuery.data?.sourceErrors ?? []).map((error) => ({ ...error, source: `Historia · ${error.source}` })),
      ...(nightQuery.data?.sourceErrors ?? []),
      ...(correlationsQuery.data?.sourceErrors ?? []),
      ...(nightContextQuery.data?.sourceErrors ?? []).map((error) => ({ ...error, source: `Przed nocą · ${error.source}` })),
      ...[
        { source: 'Pomiary dnia', error: dailyQuery.error },
        { source: 'Historia Oura', error: historyQuery.error },
        { source: 'Przebieg nocy', error: nightQuery.error },
        { source: 'Kontekst nocy', error: nightContextQuery.error },
        { source: 'Korelacje', error: correlationsQuery.error },
        { source: 'Zależności snu', error: drivers.error },
      ].flatMap(({ source, error }) => error ? [{ source, message: error.message }] : []),
    ],
    userId,
    date: dailyQuery.data?.date ?? null,
    strainRow: dailyQuery.data?.row ?? null,
    oura: dailyQuery.data?.oura ?? null,
    ouraYesterday: dailyQuery.data?.ouraYesterday ?? null,
    enhanced: dailyQuery.data?.enhanced ?? null,
    enhancedYesterday: dailyQuery.data?.enhancedYesterday ?? null,
    ouraHistory: historyQuery.data?.ouraHistory ?? [],
    enhancedHistory: historyQuery.data?.enhancedHistory ?? [],
    birthDateStr: dailyQuery.data?.birthDateStr ?? null,
    biologicalSex: dailyQuery.data?.biologicalSex ?? null,
    garminVo2Max: dailyQuery.data?.garminVo2Max ?? null,
    externalVo2Source: dailyQuery.data?.externalVo2Source ?? null,
    nightDetails: nightQuery.data ?? null,
    nightContext: nightContextQuery.data ?? null,
    correlations: correlationsQuery.data ?? null,
    correlationsError: correlationsQuery.error?.message ?? null,
    correlationsLoading: correlationsQuery.isLoading,
  };

  return (
    <OuraHealthView
      activeSection={activeSection}
      data={data}
      detailsAnchor={detailsAnchor}
      drivers={drivers}
      isLoading={dailyQuery.isLoading || historyQuery.isLoading || nightQuery.isLoading || nightContextQuery.isLoading}
      isSyncing={isSyncing}
      onExit={() => navigate(-1)}
      onOpenDetails={(anchor) => {
        setDetailsAnchor(anchor);
        setActiveSection('details');
      }}
      onSectionChange={(section) => {
        if (section === 'today') setDetailsAnchor(undefined);
        setActiveSection(section);
      }}
      onSync={handleSync}
    />
  );
}
