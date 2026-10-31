export const TODAY_SECTIONS = [
  { id: 'vision', label: 'Wizja i sprint' },
  { id: 'goals', label: 'Cele trzech sfer' },
  { id: 'plan', label: 'Pięć zwycięstw' },
  { id: 'recovery', label: 'Sen i regeneracja' },
  { id: 'food', label: 'Jedzenie' },
  { id: 'agenda', label: 'Najbliższy ruch' },
  { id: 'snapshot', label: 'Podsumowanie dnia' },
] as const;

export type TodaySectionId = typeof TODAY_SECTIONS[number]['id'];
export interface TodayLayout {
  version: 1;
  sections: Array<{ id: TodaySectionId; visible: boolean }>;
}

export const DEFAULT_TODAY_LAYOUT: TodayLayout = {
  version: 1,
  sections: TODAY_SECTIONS.map(({ id }) => ({ id, visible: true })),
};

/** Unknown cards are ignored; newly introduced cards retain their default visibility. */
export function parseTodayLayout(value: unknown): TodayLayout {
  const defaults = () => ({ version: 1 as const, sections: DEFAULT_TODAY_LAYOUT.sections.map(section => ({ ...section })) });
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return defaults(); }
  }
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1
    || !('sections' in value) || !Array.isArray(value.sections)) return defaults();

  const sections: TodayLayout['sections'] = [];
  for (const candidate of value.sections) {
    if (!candidate || typeof candidate !== 'object' || !('id' in candidate)
      || !('visible' in candidate) || typeof candidate.visible !== 'boolean') continue;
    const known = TODAY_SECTIONS.find(section => section.id === candidate.id);
    if (known && !sections.some(section => section.id === known.id)) {
      sections.push({ id: known.id, visible: candidate.visible });
    }
  }
  for (const section of defaults().sections) {
    if (!sections.some(saved => saved.id === section.id)) sections.push(section);
  }
  return { version: 1, sections };
}
