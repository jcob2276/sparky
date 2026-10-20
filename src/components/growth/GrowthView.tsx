import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Inbox } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useSession } from '../../store/useStore';
import { confirmDialog } from '../../lib/notify';
import { MAX_ACTIVE_PER_MONTH, dailySlot, type LearningAssignment } from '../../lib/learning/learningModel';
import { Pressable } from '../ui/ControlPrimitives';
import LearningAddModal from './learning/LearningAddModal';
import LearningHistorySection from './learning/LearningHistorySection';
import LearningMonthSection from './learning/LearningMonthSection';
import LibraryShelf from './shelf/LibraryShelf';
import {
  useDropAssignment,
  useLearningMonth,
  useLogLearningProgress,
  usePastAssignments,
  useTopSkills,
} from './learning/useLearningPlan';

interface Props {
  session?: Session;
  onBack?: () => void;
  onNavigateTo?: (dest: string) => void;
}

/** Rozwój: plan nauki na miesiąc (max 3 materiały), dzienny slot, jedno kliknięcie „zrobione” i biblioteka-półka. */
export default function GrowthView({ session: propSession, onBack, onNavigateTo }: Props) {
  const storeSession = useSession();
  const userId = (propSession || storeSession)?.user?.id;
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  const month = useLearningMonth(userId);
  const skills = useTopSkills(userId, true);
  const past = usePastAssignments(userId, month.monthStart);
  const log = useLogLearningProgress();
  const drop = useDropAssignment(userId);

  const skillLabels = Object.fromEntries((skills.data ?? []).map((skill) => [skill.id, skill.label]));
  const activeCount = month.assignments.filter((a) => a.status === 'active').length;
  const excludeLinkIds = month.assignments.flatMap((a) => (a.link_id ? [a.link_id] : []));
  const busyId = log.isPending ? log.variables?.assignmentId ?? null : null;

  const handleBack = () => (onBack ? onBack() : navigate(-1));
  const openPocket = () => (onNavigateTo ? onNavigateTo('links') : navigate('/links'));

  const toggleToday = (assignment: LearningAssignment) => {
    const logged = month.loggedToday[assignment.id] ?? 0;
    const amount = logged > 0 ? 0 : dailySlot(assignment, month.today, logged).amount;
    log.mutate({ assignmentId: assignment.id, date: month.today, amount });
  };

  const dropAssignment = async (assignment: LearningAssignment) => {
    if (await confirmDialog(`Odpuścić „${assignment.title}” w tym miesiącu?`)) drop.mutate(assignment.id);
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-primary pb-20">
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
                <h1 className="text-base font-bold tracking-tight text-text-primary">Rozwój</h1>
                <p className="text-3xs font-semibold text-text-muted">Plan nauki na miesiąc</p>
              </div>
            </div>
          </div>
          <Pressable
            onClick={openPocket}
            aria-label="Otwórz Pocket"
            className="flex items-center gap-1.5 rounded-xl border border-border-custom px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
          >
            <Inbox size={14} /> Pocket
          </Pressable>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 pt-5">
        <LearningMonthSection
          monthStart={month.monthStart}
          today={month.today}
          assignments={month.assignments}
          loggedToday={month.loggedToday}
          skillLabels={skillLabels}
          loading={month.isLoading}
          error={month.error}
          busyId={busyId}
          onToggleToday={toggleToday}
          onDrop={(assignment) => void dropAssignment(assignment)}
          onAdd={() => setAddOpen(true)}
        />
        {userId && <LibraryShelf userId={userId} today={month.today} />}
        <LearningHistorySection items={past.data ?? []} />
      </main>

      {addOpen && userId && (
        <LearningAddModal
          userId={userId}
          monthStart={month.monthStart}
          today={month.today}
          nextPosition={Math.min(activeCount, MAX_ACTIVE_PER_MONTH)}
          excludeLinkIds={excludeLinkIds}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
