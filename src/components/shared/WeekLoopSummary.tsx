import { useState } from 'react';
import { Compass, Target } from 'lucide-react';
import type { DirectionContextData } from '../../lib/dailyPlanProposal';
import { Card } from '../ui/Card';
import { useUserId } from '../../store/useStore';
import { saveWeekIntention } from '../../lib/goal/goalSpine';
import { notify } from '../../lib/notify';
import { getTodayWarsaw } from '../../lib/date';
import { invokeEdge } from '../../lib/supabase';

const norm = (t: string | null | undefined) => (t ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const sameText = (a: string | null | undefined, b: string | null | undefined) => { const na = norm(a); return na.length > 0 && na === norm(b); };
const truncate = (t: string, max = 110) => t.trim().length <= max ? t.trim() : `${t.trim().slice(0, max - 1)}…`;

function getDynamicIntentionPrompt(): string {
  const day = new Date(`${getTodayWarsaw()}T12:00:00Z`).getUTCDay();
  if (day === 1 || day === 2) return 'Jaka jedna rzecz sprawi, że w niedzielę powiesz: to był wygrany tydzień?';
  if (day === 3 || day === 4) return 'Półmetek tygodnia. Na czym musisz utrzymać bezwzględny fokus do niedzieli?';
  if (day === 5 || day === 6) return 'Finisz tygodnia (ostatnie 48–72h). Co musi się wydarzyć, żeby zamknąć go z tarczą?';
  return 'Jaka jest główna intencja i tożsamość na nadchodzący tydzień?';
}

interface StrategicLineageProps {
  bhag: string | null;
  month: string | null;
  sprint: string | null;
  monthLabel?: string | null;
  showSprint: boolean;
}

function StrategicLineage({ bhag, month, sprint, monthLabel, showSprint }: StrategicLineageProps) {
  return (
    <div className="rounded-xl border border-border-custom/30 bg-surface/40 p-2.5 space-y-2 text-xs">
      {bhag && (
        <div className="flex items-start gap-2">
          <span className="text-3xs font-black uppercase tracking-widest text-text-muted shrink-0 w-14 pt-0.5">
            Rok
          </span>
          <p className="text-text-secondary leading-snug font-medium flex-1">
            {truncate(bhag, 120)}
          </p>
        </div>
      )}

      {month && (
        <div className="flex items-start gap-2">
          <span className="text-3xs font-black uppercase tracking-widest text-primary shrink-0 w-14 pt-0.5">
            {monthLabel ? monthLabel : 'Miesiąc'}
          </span>
          <p className="text-text-primary font-semibold leading-snug flex-1">
            {month}
          </p>
        </div>
      )}

      {showSprint && (
        <div className="flex items-start gap-2">
          <span className="text-3xs font-black uppercase tracking-widest text-primary shrink-0 w-14 pt-0.5">
            Sprint
          </span>
          <p className="text-text-primary font-semibold leading-snug flex-1">
            {sprint}
          </p>
        </div>
      )}
    </div>
  );
}

import { WeekIntentionBox } from './WeekIntentionBox';

interface ThreePillarsProps {
  cialo?: string | null;
  duch?: string | null;
  konto?: string | null;
}

function ThreePillars({ cialo, duch, konto }: ThreePillarsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 pt-1 border-t border-border-custom/30">
      {cialo && (
        <div className="rounded-xl border border-success/20 bg-success/[0.04] p-2">
          <span className="text-3xs font-black uppercase tracking-wider text-success block">Ciało</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{cialo}</p>
        </div>
      )}
      {duch && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-2">
          <span className="text-3xs font-black uppercase tracking-wider text-primary block">Duch</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{duch}</p>
        </div>
      )}
      {konto && (
        <div className="rounded-xl border border-warning/20 bg-warning/[0.04] p-2">
          <span className="text-3xs font-black uppercase tracking-wider text-warning block">Konto</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{konto}</p>
        </div>
      )}
    </div>
  );
}

export default function WeekLoopSummary({
  ctx,
  compact = false,
  onStartWeeklyReview,
  weekStart,
  onIntentionSaved,
}: {
  ctx: Pick<
    DirectionContextData,
    | 'weekGoals'
    | 'weekGoalsMeta'
    | 'focus'
    | 'sprintGoal'
    | 'monthTheme'
    | 'monthLabel'
    | 'bhagLine'
  >;
  compact?: boolean;
  onStartWeeklyReview?: () => void;
  weekStart?: string;
  onIntentionSaved?: () => void;
}) {
  const userId = useUserId() ?? '';
  const intention = (ctx.weekGoals.intention || ctx.weekGoals.commitment)?.trim() || null;
  const bhag = ctx.bhagLine?.trim() || null;
  const month = ctx.monthTheme?.trim() || null;
  const sprint = ctx.sprintGoal?.trim() || null;

  const [isEditing, setIsEditing] = useState(false);
  const [draftIntention, setDraftIntention] = useState(intention ?? '');
  const [saving, setSaving] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const showSprint = Boolean(sprint && !sameText(sprint, month) && !sameText(sprint, bhag));
  const showWeek = Boolean(
    intention && !sameText(intention, month) && !sameText(intention, sprint) && !sameText(intention, bhag),
  );

  const handleAiSuggest = async () => {
    setAiSuggesting(true);
    try {
      const prompt = `Zaproponuj jedno zwięzłe, motywujące zdanie intencji na ten tydzień w Vanguard OS.
Kontekst: Rok: ${bhag || 'brak'}, Miesiąc: ${month || 'brak'}, Sprint: ${sprint || 'brak'}.
Zwróć TYLKO 1 konkretne zdanie w języku polskim, bez cudzysłowów.`;
      const res = (await invokeEdge('vanguard-oracle', {
        body: { query: prompt, question: prompt },
      })) as { answer?: string; text?: string; response?: string; content?: string };
      const raw = (res?.answer || res?.text || res?.response || res?.content || '').trim();
      const firstLine = raw.split('\n')[0].replace(/^["'„”]|["'„”]$/g, '').trim();
      const suggestion = firstLine || (month ? `Fokus na: ${month}` : 'Ochronić regenerację i dowieźć priorytety.');
      setDraftIntention(suggestion);
      setIsEditing(true);
      notify('AI przygotowało intencję tygodnia', 'success');
    } catch {
      const fallback = month ? `Fokus na: ${month}` : 'Ochronić regenerację i dowieźć priorytety.';
      setDraftIntention(fallback);
      setIsEditing(true);
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSaveIntention = async () => {
    if (!userId || !weekStart) return;
    setSaving(true);
    try {
      await saveWeekIntention(userId, weekStart, draftIntention);
      notify('Zapisano intencję tygodnia', 'success');
      setIsEditing(false);
      onIntentionSaved?.();
    } catch (err) {
      notify('Nie udało się zapisać intencji.', 'error');
      console.warn('[WeekLoopSummary] saveWeekIntention error:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasPillars = Boolean(ctx.weekGoals.cialo || ctx.weekGoals.duch || ctx.weekGoals.konto);

  return (
    <Card className={compact ? 'space-y-3' : 'space-y-4'} padding={compact ? '0.875rem' : '1.25rem'}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-text-muted">
          <Compass size={12} className="text-primary" /> Strategia & Intencja Tygodnia
        </p>
        {ctx.focus.skillLabel && (
          <span className="flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <Target size={10} /> Focus: {ctx.focus.skillLabel}
            {ctx.focus.subskillLabel ? ` → ${ctx.focus.subskillLabel}` : ''}
          </span>
        )}
      </div>

      <StrategicLineage
        bhag={bhag}
        month={month}
        sprint={sprint}
        monthLabel={ctx.monthLabel}
        showSprint={showSprint}
      />

      <WeekIntentionBox
        intention={intention}
        showWeek={showWeek}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        draftIntention={draftIntention}
        setDraftIntention={setDraftIntention}
        saving={saving}
        aiSuggesting={aiSuggesting}
        handleAiSuggest={() => void handleAiSuggest()}
        handleSaveIntention={() => void handleSaveIntention()}
        onStartWeeklyReview={onStartWeeklyReview}
        weekStart={weekStart}
        sourceFallback={ctx.weekGoalsMeta?.source === 'fallback'}
        promptText={getDynamicIntentionPrompt()}
      />

      {hasPillars && !compact && (
        <ThreePillars
          cialo={ctx.weekGoals.cialo}
          duch={ctx.weekGoals.duch}
          konto={ctx.weekGoals.konto}
        />
      )}
    </Card>
  );
}

