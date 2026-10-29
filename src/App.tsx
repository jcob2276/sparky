import { useEffect, lazy, Suspense, type ReactNode, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppAuthSession } from './hooks/useAppAuthSession';
import { isNativePlatform } from './lib/native/platform';
import { initUsageStatsSync } from './lib/native/usageStatsSync';
import { initLocationSync } from './lib/native/locationSync';
import { initBackgroundSync } from './lib/native/backgroundSync';
import { initDeviceSignalsSync } from './lib/native/deviceSignalsSync';
import { initNativeIntents, registerNativeNavigate } from './lib/native/initNativeIntents';
import { initFoodWidgetSync } from './lib/native/foodWidgetSync';
import { hideSplashScreen } from './lib/native/initNativeShell';
import Auth from './components/core/Auth';
import Dashboard from './components/core/Dashboard';
import { ErrorBoundary } from './components/core/ErrorBoundary';
import { OfflineStatusBanner } from './components/core/OfflineStatusBanner';
import { ToastHost } from './components/ui/ToastHost';
import ShellSkeleton from './components/ui/ShellSkeleton';
import PageTemplateBoundary, { type PageTemplateKind } from './components/shared/PageTemplateBoundary';
import ActionHistoryController from './components/core/ActionHistoryController';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

const DesktopDashboard = lazy(() => import('./components/desktop/shell/DesktopDashboard'));
const SettingsView = lazy(() => import('./components/settings/SettingsView'));
const MedicalStudiesPage = lazy(() => import('./components/medical/MedicalStudiesPage'));
const MedicalLaboratoryPage = lazy(() => import('./components/medical/MedicalLaboratoryPage'));
const CorrelationsPage = lazy(() => import('./components/correlations/CorrelationsPage'));
const EndMyopiaCalculator = lazy(() => import('./components/medical/EndMyopiaCalculator'));
const FinancePage = lazy(() => import('./components/finance/FinancePage'));
const OuraHealthPage = lazy(() => import('./components/biometrics/OuraHealthPage'));
const GrowthView = lazy(() => import('./components/growth/GrowthView'));
import { queryClient } from './lib/queryClient';
import { setupGlobalBleSync } from './lib/biometrics/ouraBleSync';

const FALLBACK_SPINNER = <ShellSkeleton />;

function Screen({ kind, children }: { kind: PageTemplateKind; children: ReactNode }) {
  return <PageTemplateBoundary kind={kind}>{children}</PageTemplateBoundary>;
}

function useNativePlatformSync(userId: string | undefined, handleNativeNavigate: (path: string) => void) {
  useEffect(() => {
    if (!import.meta.env.DEV && !isNativePlatform() && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.debug('[sw] Registered successfully:', reg.scope))
        .catch((err) => console.error('[sw] Registration failed:', err));
    }
  }, []);

  useEffect(() => {
    registerNativeNavigate(handleNativeNavigate);
    void initNativeIntents();
    return () => registerNativeNavigate(null);
  }, [handleNativeNavigate]);

  useEffect(() => {
    if (!userId || !isNativePlatform()) return;
    const stopUsage = initUsageStatsSync(userId);
    const stopLocation = initLocationSync(userId);
    const stopBackground = initBackgroundSync(userId);
    const stopSignals = initDeviceSignalsSync(userId);
    const stopBleSync = setupGlobalBleSync(queryClient, userId);
    const stopFoodWidget = initFoodWidgetSync(userId);
    return () => {
      stopFoodWidget();
      stopUsage();
      stopLocation();
      stopBackground();
      stopSignals();
      stopBleSync();
    };
  }, [userId]);
}

function AppRoutes() {
  const { session, loading } = useAppAuthSession();
  const navigate = useNavigate();

  const handleNativeNavigate = useCallback((path: string) => {
    navigate(path, { replace: true });
  }, [navigate]);

  useNativePlatformSync(session?.user.id, handleNativeNavigate);

  useEffect(() => {
    if (!loading) {
      void hideSplashScreen();
    }
  }, [loading]);

  if (loading) {
    return FALLBACK_SPINNER;
  }

  if (!session) return <Auth />;

  return (
    <Routes key={session.user.id}>
      <Route path="/" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/dzis" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/tydzien" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/historia" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/keep" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/todo" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/kalendarz" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/terminy" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/links" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/trening" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/sauna" element={<Screen kind="dashboard"><Dashboard /></Screen>} />

      <Route path="/dashboard" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><DesktopDashboard /></Screen>
        </Suspense>
      } />
      <Route path="/settings" element={<Screen kind="list"><Suspense fallback={FALLBACK_SPINNER}><SettingsView /></Suspense></Screen>} />
      <Route path="/finanse" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><FinancePage /></Screen>
        </Suspense>
      } />
      <Route path="/rozwoj" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><GrowthView session={session} /></Screen>
        </Suspense>
      } />
      <Route path="/badania" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="list"><MedicalStudiesPage /></Screen>
        </Suspense>
      } />
      <Route path="/badania/laboratorium" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="list"><MedicalLaboratoryPage /></Screen>
        </Suspense>
      } />
      <Route path="/korelacje" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><CorrelationsPage /></Screen>
        </Suspense>
      } />
      <Route path="/oura" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><OuraHealthPage /></Screen>
        </Suspense>
      } />

      <Route path="/optics" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="list"><EndMyopiaCalculator /></Screen>
        </Suspense>
      } />
      <Route path="*" element={<Navigate to="/dzis" replace />} />
      </Routes>
  );
}

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset}>
          <BrowserRouter>
            <OfflineStatusBanner />
            <AppRoutes />
            <ActionHistoryController />
            <ToastHost />
          </BrowserRouter>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

export default App;
