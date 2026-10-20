import type { TaskSlot } from '../usePowerListTypes';
import {
  suggestDailyKpiTarget,
  kpiSlotHint,
  defaultPillarProject,
  pickRollupKpi,
  type KpiHint,
} from '../../../lib/dailyPlanProposal';
import type { UsePowerListActionsArgs } from './usePowerListActionsTypes';
import { SPHERE_SLOTS } from './powerListSlotOptions';

export function updateSlotHelper(args: UsePowerListActionsArgs, i: number, patch: Partial<TaskSlot>) {
  args.setNewTaskForm((prev) => {
    const n = [...prev];
    n[i] = { ...n[i], ...patch };
    if (patch.task !== undefined && !patch.task.trim()) {
      n[i].checkpointId = null;
      n[i].projectId = null;
      n[i].pinId = null;
      n[i].targetValue = '';
      n[i].kpiId = null;
    }
    const taskText = patch.task !== undefined ? patch.task : n[i].task;
    if (taskText.trim() && i < 3 && !n[i].projectId && !patch.projectId) {
      const pillar = SPHERE_SLOTS[i].category as 'cialo' | 'duch' | 'konto';
      const binding = defaultPillarProject(pillar, args.pillarProjects, args.direction.sprintFocusProjectIds ?? []);
      if (binding) {
        n[i].projectId = binding.projectId;
        const picked = pickRollupKpi(binding.kpis);
        n[i].kpiId = picked?.id ?? null;
        const hint = kpiSlotHint(binding.kpis, n[i].kpiId);
        if (hint.autoTarget && !n[i].targetValue?.trim()) n[i].targetValue = hint.autoTarget;
      }
    }
    if (patch.kpiId !== undefined) {
      n[i].kpiId = patch.kpiId;
      args.setTodaySlotKpis((prev) => {
        const next = { ...prev };
        if (patch.kpiId) next[i] = patch.kpiId;
        else delete next[i];
        return next;
      });
    }
    if (patch.projectId !== undefined) {
      const proj =
        args.allProjectOptions.find((p) => p.id === patch.projectId) ??
        args.pillarProjects.find((p) => p.projectId === patch.projectId);
      const kpis: KpiHint[] = proj?.kpis ?? [];
      const picked = pickRollupKpi(kpis, n[i].kpiId);
      n[i].kpiId = picked?.id ?? null;
      const kpiRow = kpis.find((k) => k.id === n[i].kpiId);
      const suggested = suggestDailyKpiTarget(kpiRow ? [kpiRow] : kpis);
      if (suggested && !n[i].targetValue?.trim()) n[i].targetValue = suggested;
      if (!patch.projectId) n[i].kpiId = null;
    }
    return n;
  });
}
