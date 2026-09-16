import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { Card } from '../ui/Card';
import { notify } from '../../lib/notify';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  LIFE_SPHERES,
  fetchSphereBudgets,
  saveSphereBudget,
  fetchWeeklySphereActuals,
  type SphereHours,
  type LifeSphereId,
} from '../../lib/projects/lifeSpheres';
import { getWeekStartWarsaw, shiftWeekStart, formatWeekRange, isCurrentWeek } from '../../lib/growth/growth';
import { getTodayWarsaw } from '../../lib/date';
import { listTodoItems, updateTodoItem } from '../../lib/todo/todo';
import {
  WeeklyBalanceRadarSvg,
  polygonPoints,
  emptyBudgetMap,
  type BudgetBounds,
} from './WeeklyBalanceRadarSvg';

/** Architektura Tygodnia — budget vs actual hours per life sphere */
export default function WeeklyBalanceHexagon({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getWeekStartWarsaw(getTodayWarsaw()));
  const [editingSphere, setEditingSphere] = useState<LifeSphereId | null>(null);
  const [draftHours, setDraftHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const dataQuery = useQuery({
    queryKey: ['weekly-balance-hexagon', userId, weekStart],
    queryFn: async () => {
      const [budgetRows, actualHours, items] = await Promise.all([
        fetchSphereBudgets(userId),
        fetchWeeklySphereActuals(userId, weekStart),
        listTodoItems(userId),
      ]);
      const map = emptyBudgetMap();
      budgetRows.forEach((b) => {
        if (b.category in map) map[b.category as LifeSphereId] = { min: b.min_hours, max: b.max_hours };
      });
      return { budgets: map, actuals: actualHours, tasks: items.filter((t) => t.status === 'open' && t.is_important) };
    },
    enabled: !!userId,
  });

  const budgets = dataQuery.data?.budgets ?? emptyBudgetMap();
  const actuals = dataQuery.data?.actuals ?? null;
  const tasks = dataQuery.data?.tasks ?? [];
  const loading = dataQuery.isLoading;

  const targetFor = useCallback(
    (sphere: LifeSphereId) => budgets[sphere]?.max ?? budgets[sphere]?.min ?? 0,
    [budgets],
  );

  const axisScale = useMemo(() => {
    const values = LIFE_SPHERES.flatMap((s) => [targetFor(s.id), actuals?.[s.id] ?? 0]);
    return Math.max(6, ...values) * 1.15;
  }, [targetFor, actuals]);

  const budgetPoints = useMemo(
    () => polygonPoints(LIFE_SPHERES.map((s) => targetFor(s.id)), axisScale),
    [targetFor, axisScale],
  );
  const actualPoints = useMemo(
    () => polygonPoints(LIFE_SPHERES.map((s) => actuals?.[s.id] ?? 0), axisScale),
    [actuals, axisScale],
  );

  const startEditing = (sphere: LifeSphereId) => {
    setEditingSphere(sphere);
    setDraftHours(budgets[sphere]?.max != null ? String(budgets[sphere].max) : '');
  };

  const saveTarget = async () => {
    if (!editingSphere) return;
    setSaving(true);
    try {
      const hours = draftHours.trim() === '' ? null : Number(draftHours);
      const currentMin = budgets[editingSphere]?.min ?? null;
      await saveSphereBudget(userId, editingSphere, currentMin, hours);
      await queryClient.invalidateQueries({ queryKey: ['weekly-balance-hexagon', userId] });
      setEditingSphere(null);
    } catch (err: unknown) {
      notify('Nie udało się zapisać budżetu.', 'error');
      console.warn('[WeeklyBalanceHexagon] Failed to save sphere budget:', err);
    } finally {
      setSaving(false);
    }
  };

  const assignSelectedTask = async (sphere: LifeSphereId) => {
    if (!selectedTaskId || assigning) return;
    setAssigning(true);
    const taskId = selectedTaskId;
    try {
      await updateTodoItem(taskId, { category: sphere });
      await queryClient.invalidateQueries({ queryKey: ['weekly-balance-hexagon', userId] });
    } catch (err: unknown) {
      notify('Nie udało się przypisać zadania do obszaru.', 'error');
      console.warn('[WeeklyBalanceHexagon] Failed to update todo category:', err);
    } finally {
      setSelectedTaskId(null);
      setAssigning(false);
    }
  };

  const [viewMode, setViewMode] = useState<'bars' | 'radar'>('bars');

  return (
    <Card padding="1rem" className="space-y-4" style={{ background: 'var(--color-theme-hex-ba17243902)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-text-primary">Architektura Tygodnia</p>
          <p className="text-xs text-text-muted">Budżet (cel) vs realny czas per sfera życia</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border-custom/40 bg-surface/60 p-0.5 text-3xs font-black uppercase">
            <Pressable
              type="button"
              onClick={() => setViewMode('bars')}
              className={`px-2 py-1 rounded-md transition-all ${
                viewMode === 'bars' ? 'bg-primary text-on-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Paski
            </Pressable>
            <Pressable
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-2 py-1 rounded-md transition-all ${
                viewMode === 'radar' ? 'bg-primary text-on-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Heksagon
            </Pressable>
          </div>

          <div className="flex items-center gap-1">
            <Pressable
              type="button"
              onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))}
              className="p-1 rounded-lg border border-border-custom/50 text-text-muted hover:text-text-primary transition-colors btn-press"
            >
              <ChevronLeft size={13} />
            </Pressable>
            <span className="text-2xs font-bold text-text-secondary min-w-[70px] text-center">
              {formatWeekRange(weekStart)}{isCurrentWeek(weekStart) ? ' • dziś' : ''}
            </span>
            <Pressable
              type="button"
              onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))}
              className="p-1 rounded-lg border border-border-custom/50 text-text-muted hover:text-text-primary transition-colors btn-press"
            >
              <ChevronRight size={13} />
            </Pressable>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-44 w-full animate-pulse rounded-2xl bg-surface border border-border-custom/40" />
      ) : viewMode === 'bars' ? (
        /* Practical Bars View */
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LIFE_SPHERES.map((s) => {
            const actual = actuals?.[s.id] ?? 0;
            const target = targetFor(s.id);
            const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
            const isAssigned = selectedTaskId != null;

            return (
              <div
                key={s.id}
                onClick={() => (isAssigned ? assignSelectedTask(s.id) : startEditing(s.id))}
                className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                  isAssigned
                    ? `${s.border} ${s.bgSoft} hover:scale-[1.01]`
                    : 'border-border-custom/40 bg-surface/50 hover:border-border-custom/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary truncate">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-2xs font-black text-text-secondary shrink-0">
                    {actual.toFixed(1)}h{target > 0 ? ` / ${target}h` : ''}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-custom/30">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${s.dot}`}
                    style={{ width: `${target > 0 ? pct : actual > 0 ? 100 : 0}%` }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-3xs text-text-muted">
                  <span>{target > 0 ? `${pct}% celu` : 'Brak celu'}</span>
                  <span className="hover:text-primary transition-colors">Edytuj cel</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <WeeklyBalanceRadarSvg
          budgetPoints={budgetPoints}
          actualPoints={actualPoints}
          selectedTaskId={selectedTaskId}
          onAssignTask={assignSelectedTask}
          onStartEditing={startEditing}
        />
      )}

      {editingSphere && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
          <span className="text-xs font-bold text-text-primary flex-1">
            Cel godzin/tydzień: {LIFE_SPHERES.find((s) => s.id === editingSphere)?.label}
          </span>
          <ControlInput
            type="number"
            min={0}
            step={0.5}
            autoFocus
            value={draftHours}
            onChange={(e) => setDraftHours(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void saveTarget(); }}
            className="w-16 rounded-lg border border-border-custom/50 bg-surface-solid/60 px-2 py-1 text-xs text-text-primary outline-none focus:border-primary/30"
          />
          <Pressable
            variant="primary"
            size="sm"
            type="button"
            onClick={() => void saveTarget()}
            disabled={saving}
            loading={saving}
            className="rounded-lg px-2.5 py-1 text-xs font-black btn-press"
          >
            Zapisz
          </Pressable>
          <Pressable
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setEditingSphere(null)}
            className="text-xs font-semibold text-text-muted hover:text-text-primary"
          >
            Anuluj
          </Pressable>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-muted">
            {selectedTaskId ? 'Wybierz sferę powyżej, żeby przypisać zadanie ↑' : 'Priorytetowe zadania — dotknij, potem wybierz sferę'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tasks.map((t) => {
              const sphere = LIFE_SPHERES.find((s) => s.id === t.category);
              const isSelected = selectedTaskId === t.id;
              return (
                <Pressable
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTaskId(isSelected ? null : t.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors btn-press ${
                    isSelected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border-custom/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {sphere && <span className={`h-1.5 w-1.5 rounded-full ${sphere.dot}`} />}
                  {t.title}
                  {isSelected && <Check size={10} />}
                </Pressable>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
