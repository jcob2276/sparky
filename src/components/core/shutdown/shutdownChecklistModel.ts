export interface ShutdownChecklistItem {
  id: string;
  label: string;
}

export type ShutdownChecklistRow = ShutdownChecklistItem & {
  checked: boolean;
  kind: 'ritual' | 'custom';
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
  checkedItemIds: Set<string>;
}

export function buildShutdownChecklistRows({
  customItems,
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
  return [...rituals, ...custom];
}

export function normalizeCustomShutdownItem(
  value: string,
  createId: () => string = () => crypto.randomUUID(),
): ShutdownChecklistItem | null {
  const label = value.trim();
  return label ? { id: `custom-${createId()}`, label } : null;
}
