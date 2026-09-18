/**
 * @component Stats
 * @role Hub zakładki Kronika: pomiary ciała, zdjęcia, siłownia, bieganie (Strava), eksport danych.
 * @usedBy DashboardHistoriaTab
 */
import type { ReactNode } from 'react';
import { BodyMetricsSection } from './stats/BodyMetricsSection';
import { WorkoutHistorySection } from './stats/WorkoutHistorySection';
import { ChronicleMilestonesBar } from './stats/ChronicleMilestonesBar';
import { ChronicleExportModal } from './stats/ChronicleExportModal';
import { useStatsData } from './hooks/useStatsData';
import { mergeLatestBodyMetrics } from '../../lib/health/bodyMetrics';

export type ChronicleDomain = 'body' | 'gym' | 'running' | 'all';

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
  if (loading) return <div className="p-8 text-center text-text-muted uppercase font-black animate-pulse tracking-widest">Wczytywanie...</div>;

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

  return (
    <div className="space-y-5 pb-6">
      {/* Milestone / Big Picture Bar */}
      <ChronicleMilestonesBar
        bodyData={bodyData}
        recentSessions={recentSessions}
        latestBody={latestBody}
      />

      {/* Body & Physique Section */}
      {showBody && (
        <div className="space-y-5">
          <BodyMetricsSection
            trends={trends}
            newMetric={newMetric}
            setNewMetric={setNewMetric}
            latestBody={latestBody}
            heightCm={heightCm}
            saveMetrics={saveMetrics}
          />
          {photosSlot}
        </div>
      )}

      {/* Strength & Gym Section */}
      {showGym && (
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
      )}

      {/* Running / Endurance Section */}
      {showRunning && runningSlot}

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
