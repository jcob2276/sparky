import { useState, useEffect, lazy, Suspense, type ReactNode, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store/useStore';
import { isNativePlatform } from './lib/native/platform';
import { initUsageStatsSync } from './lib/native/usageStatsSync';
import { initLocationSync } from './lib/native/locationSync';
import { initBackgroundSync } from './lib/native/backgroundSync';
import { initNativeIntents, registerNativeNavigate } from './lib/native/initNativeIntents';
import { hideSplashScreen } from './lib/native/initNativeShell';
import Auth from './components/core/Auth';
import Dashboard from './components/core/Dashboard';
import { ErrorBoundary } from './components/core/ErrorBoundary';
import { OfflineStatusBanner } from './components/core/OfflineStatusBanner';
import { ToastHost } from './components/ui/ToastHost';
import Spinner from './components/ui/Spinner';
import SettingsView from './components/settings/SettingsView';
import PageTemplateBoundary, { type PageTemplateKind } from './components/shared/PageTemplateBoundary';
import ActionHistoryController from './components/core/ActionHistoryController';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

const DesktopDashboard = lazy(() => import('./components/desktop/shell/DesktopDashboard'));
const MedicalStudiesPage = lazy(() => import('./components/medical/MedicalStudiesPage'));
const MedicalLaboratoryPage = lazy(() => import('./components/medical/MedicalLaboratoryPage'));
const CorrelationsPage = lazy(() => import('./components/correlations/CorrelationsPage'));
const EndMyopiaCalculator = lazy(() => import('./components/medical/EndMyopiaCalculator'));
const FinancePage = lazy(() => import('./components/finance/FinancePage'));
const DesignSystemPage = lazy(() => import('./components/dev/DesignSystemPage'));
const OuraHealthPage = lazy(() => import('./components/biometrics/OuraHealthPage'));
const GrowthView = lazy(() => import('./components/growth/GrowthView'));
import { queryClient } from './lib/queryClient';
import { setupGlobalBleSync } from './lib/biometrics/ouraBleSync';
import FluxOverlay from './components/nightShift/FluxOverlay';

const FALLBACK_SPINNER = (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Spinner size="lg" />
  </div>
);

function KorealcjeRedirect() {
  return <Navigate to="/korelacje" replace />;
}

function Screen({ kind, children }: { kind: PageTemplateKind; children: ReactNode }) {
  return <PageTemplateBoundary kind={kind}>{children}</PageTemplateBoundary>;
}

function useAppAuthSession() {
  const { session, setSession } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: never block the user on a loading spinner if auth takes longer than 1.2s
    const safetyTimer = window.setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 1200);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setLoading(false);
      window.clearTimeout(safetyTimer);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.warn('[auth] getSession error:', error.message);
          setSession(null);
        } else {
          setSession(data.session);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        console.warn('[auth] getSession failed:', err instanceof Error ? err.message : err);
        setSession(null);
      })
      .finally(() => {
        if (!mounted) return;
        window.clearTimeout(safetyTimer);
        setLoading(false);
      });

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [setSession]);

  return { session, loading };
}

function useNativePlatformSync(userId: string | undefined, handleNativeNavigate: (path: string) => void) {
  useEffect(() => {
    if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
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
    const stopBleSync = setupGlobalBleSync(queryClient, userId);
    return () => {
      stopUsage();
      stopLocation();
      stopBackground();
      stopBleSync();
    };
  }, [userId]);
}

function AppRoutes() {
  const { session, loading } = useAppAuthSession();
  const location = useLocation();
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

  if (import.meta.env.DEV && location.pathname === '/dev/design-system') {
    return (
      <Suspense fallback={FALLBACK_SPINNER}>
        <DesignSystemPage />
      </Suspense>
    );
  }

  if (!session) return <Auth />;

  return (
    <Routes>
      <Route path="/" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/dzis" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/tydzien" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/projekty" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/historia" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/keep" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/todo" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/kalendarz" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/terminy" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/links" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/fundament" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/trening" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/cwiczenie" element={<Screen kind="dashboard"><Dashboard /></Screen>} />
      <Route path="/sauna" element={<Screen kind="dashboard"><Dashboard /></Screen>} />

      <Route path="/dashboard" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><DesktopDashboard /></Screen>
        </Suspense>
      } />
      <Route path="/settings" element={<Screen kind="list"><SettingsView /></Screen>} />
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
      <Route path="/korealcje" element={<KorealcjeRedirect />} />

      <Route path="/optics" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="list"><EndMyopiaCalculator /></Screen>
        </Suspense>
      } />
      <Route path="/dev/design-system" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="grid"><DesignSystemPage /></Screen>
        </Suspense>
      } />
      <Route path="/czat" element={<Navigate to="/dzis" replace />} />
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
            <FluxOverlay />
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
