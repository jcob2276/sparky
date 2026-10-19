export const PRIORITY_OPTIONS = [
  { id: 'urgent', label: 'P1 · Pilne', tone: 'text-danger' },
  { id: 'high', label: 'P2 · Ważne', tone: 'text-warning' },
  { id: 'normal', label: 'P3 · Normalne', tone: 'text-text-secondary' },
  { id: 'low', label: 'P4 · Niskie', tone: 'text-info' },
] as const;

export function priorityTone(priority: string | null | undefined): string {
  return PRIORITY_OPTIONS.find((o) => o.id === priority)?.tone ?? 'text-text-secondary';
}
