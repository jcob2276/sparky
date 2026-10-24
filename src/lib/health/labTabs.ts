export type LabTab = 'przeglad' | 'wyniki' | 'trendy' | 'dokumenty';

export const LAB_TABS: { key: LabTab; label: string }[] = [
  { key: 'przeglad', label: 'Przegląd' },
  { key: 'wyniki', label: 'Wyniki' },
  { key: 'trendy', label: 'Trendy' },
  { key: 'dokumenty', label: 'Dokumenty' },
];

/** Dawne identyfikatory sekcji (przewijanie) → zakładka, w której sekcja leży teraz. */
const SECTION_TO_TAB: Record<string, LabTab> = {
  przeglad: 'przeglad',
  sugestie: 'przeglad',
  wyniki: 'wyniki',
  cialo: 'wyniki',
  trendy: 'trendy',
  scores: 'trendy',
  dokumenty: 'dokumenty',
};

export function tabForSection(sectionId: string): LabTab {
  return SECTION_TO_TAB[sectionId] ?? 'przeglad';
}
