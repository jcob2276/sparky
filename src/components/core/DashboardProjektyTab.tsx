/**
 * @component DashboardProjektyTab
 * @role Zakładka KIERUNEK — trzy sfery, aktywne projekty i przejście do Top 5.
 * @composes projects/DirectionView
 * @usedBy Dashboard
 */
import { memo } from 'react';
import Skeleton from '../ui/Skeleton';
import { useSession } from '../../store/useStore';
import { ProjectsProvider } from '../projects/context/ProjectsContext';
import { useProjectsContext } from '../projects/context/projectsContextStore';
import { DirectionView } from '../projects/DirectionView';

function ViewFallback() {
  return (
    <Skeleton variant="block" className="min-h-[var(--ds-h-220px)]" />
  );
}

function DashboardProjektyContent() {
  const { loading } = useProjectsContext();

  if (loading) return <ViewFallback />;
  return <DirectionView />;
}

export const DashboardProjektyTab = memo(function DashboardProjektyTab() {
  const session = useSession();

  if (!session) return null;

  return (
    <ProjectsProvider userId={session.user.id}>
      <DashboardProjektyContent />
    </ProjectsProvider>
  );
});
