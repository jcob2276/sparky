/**
 * @component Stats
 * @role Hub zakładki Kronika: pomiary ciała, zdjęcia, siłownia, bieganie (Strava), eksport danych.
 * Domena 'none' montuje tylko okno eksportu (zakładki Duch i Konto).
 * @usedBy DashboardHistoriaTab
 */
import Skeleton from '../ui/Skeleton';
import type { ReactNode } from 'react';
import { BodyMetricsSection } from './stats/BodyMetricsSection';
import { WorkoutHistorySection } from './stats/WorkoutHistorySection';
import { ChronicleMilestonesBar } from './stats/ChronicleMilestonesBar';
import { ChronicleExportModal } from './stats/ChronicleExportModal';
import ChronicleAccordion from './chronicle/ChronicleAccordion';
import { useStatsData } from './hooks/useStatsData';
import { mergeLatestBodyMetrics } from '../../lib/health/bodyMetrics';

type ChronicleDomain = 'body' | 'gym' | 'running' | 'all' | 'none';

interface StatsProps {
  domain?: ChronicleDomain;
  runningSlot?: ReactNode;
  photosSlot?: ReactNode;
  isExportOpen?: boolean;
  onCloseExport?: () => void;
  onOpenExport?: () => void;
}

export default function Stats({
  domain = 'body',
  runningSlot = null,
  photosSlot = null,
  isExportOpen = false,
  onCloseExport = () => {},
  onOpenExport: _onOpenExport = () => {},
}: StatsProps) {
  const {
    userId,
    loading,
    bodyData,
    newMetric,
    setNewMetric,
    heightCm,
    trends,
    saveMetrics,
    recentSessions,
    dateRange, setDateRange,
    isExporting,
    includeNutrition, setIncludeNutrition,
    includeJournal, setIncludeJournal,
    includeWorkouts, setIncludeWorkouts,
    includeBody, setIncludeBody,
    includeOura, setIncludeOura,
    includeHabits, setIncludeHabits,
    includeActivityWatch, setIncludeActivityWatch,
    includeFundament, setIncludeFundament,
    editingSession, setEditingSession,
    showAllSessions, setShowAllSessions,
    editForm, setEditForm,
    deleteSession,
    deleteLog,
    startEditing,
    updateSession,
    exportData,
    copyData,
    isCopying,
  } = useStatsData();

  if (!userId) return null;
  if (loading) return domain === 'none' ? null : <Skeleton variant="card" lines={4} className="m-5" />;

  const mergedBody = mergeLatestBodyMetrics(bodyData);
  const latestBody = mergedBody
    ? {
        weight: mergedBody.weight,
        waist: mergedBody.waist,
        neck: mergedBody.neck,
        belly: mergedBody.belly,
        hips: mergedBody.hips,
        chest: mergedBody.chest,
        thigh: mergedBody.thigh,
        biceps_l: mergedBody.biceps_l,
        calf: mergedBody.calf,
        body_fat: mergedBody.body_fat,
      }
    : null;

  const showBody = domain === 'body' || domain === 'all';
  const showGym = domain === 'gym' || domain === 'all';
  const showRunning = domain === 'running' || domain === 'all';

  const bodyPreview = [
    latestBody?.weight != null ? `Waga ${String(latestBody.weight).replace('.', ',')} kg` : null,
    latestBody?.body_fat != null ? `Tłuszcz ${String(latestBody.body_fat).replace('.', ',')}%` : null,
  ].filter(Boolean).join(' · ') || undefined;

  return (
    <div className="space-y-3 pb-6">
      {/* Sylwetka: kamienie milowe, pomiary z wykresami i zdjęcia w jednej zwijanej sekcji */}
      {showBody && (
        <ChronicleAccordion title="Sylwetka i pomiary" preview={bodyPreview}>
          <ChronicleMilestonesBar
            bodyData={bodyData}
            recentSessions={recentSessions}
            latestBody={latestBody}
          />
          <BodyMetricsSection
            trends={trends}
            newMetric={newMetric}
            setNewMetric={setNewMetric}
            latestBody={latestBody}
            heightCm={heightCm}
            saveMetrics={saveMetrics}
          />
          {photosSlot}
        </ChronicleAccordion>
      )}

      {/* Siłownia */}
      {showGym && (
        <ChronicleAccordion title="Siłownia" preview={recentSessions.length ? `${recentSessions.length} ostatnich sesji` : undefined}>
          <WorkoutHistorySection
            recentSessions={recentSessions}
            showAllSessions={showAllSessions}
            setShowAllSessions={setShowAllSessions}
            editingSession={editingSession}
            editForm={editForm}
            setEditForm={setEditForm}
            startEditing={startEditing}
            updateSession={updateSession}
            deleteSession={deleteSession}
            deleteLog={deleteLog}
            setEditingSession={setEditingSession}
          />
        </ChronicleAccordion>
      )}

      {/* Bieganie (Strava) */}
      {showRunning && runningSlot && (
        <ChronicleAccordion title="Bieganie" preview="Strava">
          {runningSlot}
        </ChronicleAccordion>
      )}

      {/* Export Modal / Sheet */}
      <ChronicleExportModal
        isOpen={isExportOpen}
        onClose={onCloseExport}
        dateRange={dateRange}
        setDateRange={setDateRange}
        includeWorkouts={includeWorkouts}
        setIncludeWorkouts={setIncludeWorkouts}
        includeBody={includeBody}
        setIncludeBody={setIncludeBody}
        includeNutrition={includeNutrition}
        setIncludeNutrition={setIncludeNutrition}
        includeJournal={includeJournal}
        setIncludeJournal={setIncludeJournal}
        includeOura={includeOura}
        setIncludeOura={setIncludeOura}
        includeHabits={includeHabits}
        setIncludeHabits={setIncludeHabits}
        includeActivityWatch={includeActivityWatch}
        setIncludeActivityWatch={setIncludeActivityWatch}
        includeFundament={includeFundament}
        setIncludeFundament={setIncludeFundament}
        exportData={exportData}
        isExporting={isExporting}
        copyData={copyData}
        isCopying={isCopying}
      />
    </div>
  );
}
