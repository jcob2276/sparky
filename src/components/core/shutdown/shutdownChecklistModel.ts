export interface ShutdownChecklistItem {
  id: string;
  label: string;
}

type ShutdownSupplementItem = {
  id: string;
  name: string;
}

export type ShutdownChecklistRow = ShutdownChecklistItem & {
  checked: boolean;
  kind: 'ritual' | 'custom' | 'supplement';
  supplementId?: string;
};

export const DEFAULT_SHUTDOWN_ITEMS: ShutdownChecklistItem[] = [
  { id: 'phone-free-morning', label: 'Poranek — 30 min bez telefonu' },
  { id: 'reading-aloud', label: 'Czytanie na głos — 15 min' },
  { id: 'reading-with-cork', label: 'Czytanie z korkiem — 15 min' },
  { id: 'breathing', label: 'Ćwiczenia oddechowe' },
  { id: 'gratitude-prayer-visualization', label: 'Wdzięczność / modlitwa / wizualizacja celu' },
];

interface BuildRowsArgs {
  customItems: ShutdownChecklistItem[];
  supplements: ShutdownSupplementItem[];
  loggedSupplementIds: Set<string>;
  checkedItemIds: Set<string>;
}

export function buildShutdownChecklistRows({
  customItems,
  supplements,
  loggedSupplementIds,
  checkedItemIds,
}: BuildRowsArgs): ShutdownChecklistRow[] {
  const rituals: ShutdownChecklistRow[] = DEFAULT_SHUTDOWN_ITEMS.map((item) => ({
    ...item,
    checked: checkedItemIds.has(item.id),
    kind: 'ritual',
  }));
  const custom: ShutdownChecklistRow[] = customItems.map((item) => ({
    ...item,
    checked: checkedItemIds.has(item.id),
    kind: 'custom',
  }));
  const supplementRows: ShutdownChecklistRow[] = supplements.map((supplement) => ({
    id: `supplement-${supplement.id}`,
    label: supplement.name,
    checked: loggedSupplementIds.has(supplement.id),
    kind: 'supplement',
    supplementId: supplement.id,
  }));
  return [...rituals, ...custom, ...supplementRows];
}

export function normalizeCustomShutdownItem(
  value: string,
  createId: () => string = () => crypto.randomUUID(),
): ShutdownChecklistItem | null {
  const label = value.trim();
  return label ? { id: `custom-${createId()}`, label } : null;
}
