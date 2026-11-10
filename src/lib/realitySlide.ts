import type { Tables } from './database.types';

export type RealitySlide = Tables<'reality_slides'>;

export const SLIDE_LIMITS = { title: 120, statement: 600, steps: 3 } as const;

export interface SlideDraft {
  title: string;
  statement: string;
  steps: string[];
}

const EMPTY_SLIDE_DRAFT: SlideDraft = { title: '', statement: '', steps: [''] };

export function draftFromSlide(slide: RealitySlide | null): SlideDraft {
  if (!slide) return EMPTY_SLIDE_DRAFT;
  return {
    title: slide.title,
    statement: slide.statement,
    steps: slide.process_steps.length > 0 ? [...slide.process_steps] : [''],
  };
}

/** Czyści szkic do zapisu: przycięte kroki, bez pustych, maks. 3. */
export function normalizeDraft(draft: SlideDraft): SlideDraft {
  return {
    title: draft.title.trim().slice(0, SLIDE_LIMITS.title),
    statement: draft.statement.trim().slice(0, SLIDE_LIMITS.statement),
    steps: draft.steps.map(step => step.trim()).filter(Boolean).slice(0, SLIDE_LIMITS.steps),
  };
}

export function isDraftSavable(draft: SlideDraft): boolean {
  return normalizeDraft(draft).title.length > 0;
}

/** Pełne dni od wybrania slajdu (UTC wystarcza: różnica instantów, nie data kalendarzowa). */
export function slideAgeDays(createdAt: string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
