import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, RefreshCw } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useSession } from '../../store/useStore';
import { fetchGrowthDashboardData } from '../../lib/growth/growthApi';
import Spinner from '../ui/Spinner';
import { Pressable } from '../ui/ControlPrimitives';
import { GrowthHeaderSection } from './GrowthHeaderSection';
import { GrowthProjectsSection } from './GrowthProjectsSection';
import { GrowthTasksSection } from './GrowthTasksSection';
import { GrowthLibrarySection } from './GrowthLibrarySection';
import { GrowthPracticeSection } from './GrowthPracticeSection';
import { GrowthModals } from './GrowthModals';

interface Props {
  session?: Session;
  onBack?: () => void;
  onNavigateTo?: (dest: string) => void;
}

export default function GrowthView({ session: propSession, onBack, onNavigateTo }: Props) {
  const storeSession = useSession();
  const session = propSession || storeSession;
  const userId = session?.user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [activeModal, setActiveModal] = useState<'theme' | 'library' | 'evidence' | null>(null);

  const queryKey = ['growth-dashboard-data', userId];
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => (userId ? fetchGrowthDashboardData(userId) : null),
    enabled: !!userId,
  });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNavigate = (path: string) => {
    if (onNavigateTo) {
      onNavigateTo(path.replace(/^\//, ''));
    } else {
      navigate(path);
    }
  };

  const handleRefresh = () => {
    startTransition(() => {
      void queryClient.invalidateQueries({ queryKey });
      void refetch();
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const identity = data?.identity ?? null;
  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];
  const libraryItems = data?.libraryItems ?? [];
  const practiceEvidences = data?.practiceEvidences ?? [];

  return (
    <div className="min-h-screen w-full bg-background text-text-primary pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] w-full border-b border-border-custom bg-background/95 backdrop-blur-[var(--blur-md)]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Pressable
              onClick={handleBack}
              aria-label="Wróć"
              className="rounded-xl border border-border-custom p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={18} />
            </Pressable>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap size={16} />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-text-primary">Rozwój & Nauka</h1>
                <p className="text-3xs font-semibold text-text-muted">Kompas, projekty, praktyka i biblioteka wiedzy</p>
              </div>
            </div>
          </div>

          <Pressable
            onClick={handleRefresh}
            aria-label="Odśwież"
            className="rounded-xl border border-border-custom p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={15} />
          </Pressable>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 pt-5">
        {/* 1. Kompas Rozwoju (Główny motyw, luka, docelowa rola) */}
        <GrowthHeaderSection
          identity={identity}
          onEdit={() => setActiveModal('theme')}
        />

        {/* 2. Aktywne Projekty Rozwojowe (SSOT z Kierunkiem) */}
        <GrowthProjectsSection
          projects={projects}
          onNavigateToProjects={() => handleNavigate('/projekty')}
        />

        {/* 3. Następne Zadania & Działania (SSOT z Todo + Top 5) */}
        {userId && (
          <GrowthTasksSection
            userId={userId}
            tasks={tasks}
            onRefresh={handleRefresh}
            onNavigateToTodo={() => handleNavigate('/todo')}
          />
        )}

        {/* 4. Biblioteka Wiedzy (Książki / Kursy / Artykuły) */}
        {userId && (
          <GrowthLibrarySection
            userId={userId}
            items={libraryItems}
            onRefresh={handleRefresh}
            onOpenAddModal={() => setActiveModal('library')}
          />
        )}

        {/* 5. Dowody Wdrożenia w Praktyce (Zasada: Przeczytane ≠ Opanowane) */}
        {userId && (
          <GrowthPracticeSection
            userId={userId}
            evidences={practiceEvidences}
            onRefresh={handleRefresh}
            onOpenAddModal={() => setActiveModal('evidence')}
          />
        )}
      </main>

      {/* Modale akcji */}
      {userId && (
        <GrowthModals
          userId={userId}
          identity={identity}
          libraryItems={libraryItems}
          practiceEvidences={practiceEvidences}
          activeModal={activeModal}
          onClose={() => setActiveModal(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
