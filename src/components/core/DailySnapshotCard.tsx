import { Pressable } from '../ui/ControlPrimitives';
import { getTodayWarsaw, getWarsawHour } from '../../lib/date';
import { Brain, CheckCircle2, Target, Zap } from 'lucide-react';
import { useUserId } from '../../store/useStore';
import { useDailySnapshotQuery, useSaveDayScoreMutation } from '../../lib/dailySnapshotApi';
import Badge from '../ui/Badge';

const MODE_STYLE: Record<string, { label: string; color?: string }> = {
  rescue:   { label: 'Tryb ratunkowy', color: 'var(--color-danger)' },
  minimal:  { label: 'Tryb minimalny', color: 'var(--color-warning)' },
  normal:   { label: 'Normalny',        color: undefined },
  optimal:  { label: 'Optymalny',       color: 'var(--color-success)' },
};

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function DailySnapshotCard() {
  const userId = useUserId();
  const today = getTodayWarsaw();
  const hourNum = getWarsawHour();

  const { data, isLoading: loading } = useDailySnapshotQuery(userId, today);
  const saveScoreMutation = useSaveDayScoreMutation(userId, today);

  const snap = data?.snap ?? null;
  const midday = data?.midday ?? null;
  const dayScore = data?.dayScore ?? null;
  const rescueStreak = data?.rescueStreak ?? 0;
  const savingScore = saveScoreMutation.isPending;

  if (!userId) return null;

  const saveScore = (score: number) => {
    if (savingScore) return;
    saveScoreMutation.mutate(score);
  };

  if (loading || !snap) return null;

  const mode = MODE_STYLE[snap.mode ?? 'normal'] ?? MODE_STYLE.normal;
  const isYesterday = snap.date && snap.date !== today;
  const showScorePicker = hourNum >= 17 && dayScore == null && !isYesterday;

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-primary" />
          <p className="text-2xs font-bold uppercase tracking-[var(--ds-arbitrary-0-15em)] text-text-muted">
            Plan dnia{isYesterday ? ' (wczoraj)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dayScore != null && (
            <span className="text-xs font-black text-text-primary">{dayScore}/10</span>
          )}
          <Badge variant="tag" color={mode.color} className="text-2xs font-black uppercase tracking-wider">
            {mode.label}
          </Badge>
        </div>
      </div>

      {/* Rescue streak alert */}
      {rescueStreak >= 3 && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.06] px-3 py-2">
          <span className="text-sm">🔴</span>
          <p className="text-xs font-bold text-danger">
            {rescueStreak} dni z rzędu tryb ratunkowy — czas zresetować priorytety
          </p>
        </div>
      )}

      {/* One clear move */}
      {snap.one_clear_move && (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-2xs">
          <p className="text-3xs font-black uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
            <Target size={12} /> Główny ruch dnia
          </p>
          <p className="text-sm font-bold leading-snug text-text-primary">
            {snap.one_clear_move}
          </p>
        </div>
      )}

      {/* Top 3 */}
      {snap.top3 && snap.top3.length > 0 && snap.top3[0] !== snap.one_clear_move && (
        <div className="space-y-2">
          {snap.top3.slice(0, 3).map((item: string, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border-custom/40 bg-surface-solid/20 p-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-3xs font-black text-primary">
                {i + 1}
              </div>
              <p className="text-xs font-semibold leading-snug text-text-secondary pt-0.5">{item}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tension action */}
      {snap.tension_action?.action && snap.tension_action.action !== 'Zdefiniuj ruch napięciowy' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 px-3.5 py-2.5">
          <Zap size={13} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <span className="block text-3xs font-black uppercase tracking-wider text-warning">Działanie napięciowe</span>
            <p className="text-xs font-medium leading-snug text-text-secondary mt-0.5">{snap.tension_action.action}</p>
          </div>
        </div>
      )}

      {/* Midday blocker */}
      {midday?.blocker && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/5 px-3.5 py-2.5">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <span className="block text-3xs font-black uppercase tracking-wider text-danger">Bloker południowy</span>
            <p className="text-xs font-medium leading-snug text-text-secondary mt-0.5">{midday.blocker}</p>
          </div>
        </div>
      )}

      {/* Evening Extraction (Kronika) */}
      {data?.eveningExtraction && (
        <div className="rounded-2xl border border-border-custom/50 bg-surface-solid/30 p-4">
          <p className="text-3xs font-black uppercase tracking-widest text-text-muted mb-1.5">
            Kronika Dnia
          </p>
          <div className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
            {data.eveningExtraction}
          </div>
        </div>
      )}



      {/* Quick day score — shows after 17:00 if not yet scored */}
      {showScorePicker && (
        <div className="pt-2 border-t border-border-custom/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-3xs font-black uppercase tracking-wider text-text-muted">Ocena Dnia (1–10)</p>
            <span className="text-3xs text-text-muted">Jak podsumowujesz dzisiejszy dzień?</span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {SCORES.map(s => (
              <Pressable
                key={s}
                onClick={() => saveScore(s)}
                disabled={savingScore}
                className={`flex h-9 items-center justify-center rounded-xl text-xs font-black transition-all active:scale-90 cursor-pointer disabled:opacity-[var(--opacity-40)] ${
                  s <= 3
                    ? 'bg-danger/10 text-danger hover:bg-danger/25 border border-danger/20'
                    : s <= 6
                    ? 'bg-warning/10 text-warning hover:bg-warning/25 border border-warning/20'
                    : 'bg-success/10 text-success hover:bg-success/25 border border-success/20'
                }`}
              >
                {s}
              </Pressable>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
