import { useState, useEffect, lazy, Suspense, type ReactNode, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import { useStore } from './store/useStore';
import { isNativePlatform } from './lib/native/platform';
import { initUsageStatsSync } from './lib/native/usageStatsSync';
import { initLocationSync } from './lib/native/locationSync';
import { initBackgroundSync } from './lib/native/backgroundSync';
import { initNativeIntents, registerNativeNavigate } from './lib/native/initNativeIntents';
import Auth from './components/core/Auth';
import Dashboard from './components/core/Dashboard';
import { ErrorBoundary } from './components/core/ErrorBoundary';
import { ToastHost } from './components/ui/ToastHost';
import SettingsView from './components/settings/SettingsView';
import PageTemplateBoundary, { type PageTemplateKind } from './components/shared/PageTemplateBoundary';
import ActionHistoryController from './components/core/ActionHistoryController';

const DesktopDashboard = lazy(() => import('./components/desktop/shell/DesktopDashboard'));
const GrowthView = lazy(() => import('./components/growth/GrowthView'));
const MedicalStudiesPage = lazy(() => import('./components/medical/MedicalStudiesPage'));
const MedicalLaboratoryPage = lazy(() => import('./components/medical/MedicalLaboratoryPage'));
const CorrelationsPage = lazy(() => import('./components/correlations/CorrelationsPage'));
const EndMyopiaCalculator = lazy(() => import('./components/medical/EndMyopiaCalculator'));
const FinancePage = lazy(() => import('./components/finance'));
const DesignSystemPage = lazy(() => import('./components/dev/DesignSystemPage'));
const OuraHealthPage = lazy(() => import('./components/biometrics/OuraHealthPage'));
const RunningPerformancePage = lazy(() => import('./components/biometrics/RunningPerformancePage'));
const CzatView = lazy(() => import('./components/chat/CzatView'));
const AlarmView = lazy(() => import('./components/lifestyle/alarm/AlarmView'));
import { queryClient } from './lib/queryClient';
import { setupGlobalBleSync } from './lib/biometrics/ouraBleSync';
import QuickCaptureWidget from './components/chat/QuickCaptureWidget';
import FluxOverlay from './components/nightShift/FluxOverlay';


const FALLBACK_SPINNER = (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
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

  const DASHBOARD_ROUTES = new Set([
    '/',
    '/dzis',
    '/tydzien',
    '/projekty',
    '/historia',
    '/keep',
    '/todo',
    '/kalendarz',
    '/terminy',
    '/links',
    '/fundament',
    '/trening',
    '/cwiczenie',
    '/sauna',
  ]);

  const routeKey = DASHBOARD_ROUTES.has(location.pathname) ? 'dashboard-shell' : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey}>
      <Route path="/" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/dzis" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/tydzien" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/projekty" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/historia" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/keep" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/todo" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/kalendarz" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/terminy" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/links" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/fundament" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/trening" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/cwiczenie" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />
      <Route path="/bieganie" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><RunningPerformancePage /></Screen>
        </Suspense>
      } />
      <Route path="/sauna" element={<Screen kind="dashboard"><Dashboard session={session} /></Screen>} />

      <Route path="/dashboard" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><DesktopDashboard session={session} /></Screen>
        </Suspense>
      } />
      <Route path="/settings" element={<Screen kind="list"><SettingsView session={session} /></Screen>} />
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
      <Route path="/czat" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><CzatView /></Screen>
        </Suspense>
      } />
      <Route path="/budzik" element={
        <Suspense fallback={FALLBACK_SPINNER}>
          <Screen kind="dashboard"><AlarmView /></Screen>
        </Suspense>
      } />
      <Route path="*" element={<Navigate to="/dzis" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <FluxOverlay />
        <AppRoutes />
        <ActionHistoryController />
        <ToastHost />
        <QuickCaptureWidget />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
