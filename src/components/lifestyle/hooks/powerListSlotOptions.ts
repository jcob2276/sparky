import type { ProjectOption } from '../usePowerListTypes';
import { kpiSlotHint, type PillarProjectBinding } from '../../../lib/dailyPlanProposal';

export const SPHERE_SLOTS = [
  { category: 'cialo', label: 'Ciało' },
  { category: 'duch',  label: 'Duch' },
  { category: 'konto', label: 'Konto' },
];

export function projectOptionsForSlotHelper(slotIndex: number, pillarProjects: PillarProjectBinding[], allProjectOptions: ProjectOption[]) {
  if (slotIndex < 3) {
    const pillar = SPHERE_SLOTS[slotIndex].category as 'cialo' | 'duch' | 'konto';
    const pillarOpts = pillarProjects.filter((p) => p.pillar === pillar);
    if (pillarOpts.length > 0) {
      return pillarOpts.map((p) => ({
        id: p.projectId,
        name: p.name ?? 'Projekt',
        kpis: p.kpis,
      }));
    }
  }
  return allProjectOptions;
}

export function kpiHintForSlotHelper(
  slotIndex: number,
  projectId: string | null,
  kpiId: string | null | undefined,
  pillarProjects: PillarProjectBinding[],
  allProjectOptions: ProjectOption[]
) {
  if (!projectId) return null;
  const proj =
    allProjectOptions.find((p) => p.id === projectId) ??
    pillarProjects.find((p) => p.projectId === projectId);
  return kpiSlotHint(proj?.kpis ?? [], kpiId);
}

export function kpisForProjectHelper(projectId: string | null, pillarProjects: PillarProjectBinding[], allProjectOptions: ProjectOption[]) {
  if (!projectId) return [];
  const proj =
    allProjectOptions.find((p) => p.id === projectId) ??
    pillarProjects.find((p) => p.projectId === projectId);
  return proj?.kpis ?? [];
}
