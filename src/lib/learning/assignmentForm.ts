import type { SavedLink } from '../linksApi';
import type { NewAssignment } from './learningApi';
import {
  DEFAULT_UNIT_BY_TYPE,
  monthEndOf,
  type LearningResourceType,
  type LearningUnit,
} from './learningModel';

const MAX_TOTAL = 5000;

export interface AssignmentFormState {
  title: string;
  resourceType: LearningResourceType;
  unit: LearningUnit;
  /** Surowy tekst z pola; puste = jeszcze nie wpisane. */
  total: string;
  dueDate: string;
  skillId: string;
  linkId: string | null;
}

export type AssignmentFormResult =
  | { ok: true; value: NewAssignment }
  | { ok: false; error: string };

const VIDEO_DOMAINS = /(youtube\.com|youtu\.be|vimeo\.com)/i;
const PODCAST_DOMAINS = /(spotify\.com|podcasts\.apple\.com|podcast)/i;

/** Zgadnięcie typu z domeny linku z Pocket (użytkownik może to zmienić). */
export function guessResourceType(link: Pick<SavedLink, 'url' | 'domain'>): LearningResourceType {
  const host = `${link.domain} ${link.url}`;
  if (VIDEO_DOMAINS.test(host)) return 'video';
  if (PODCAST_DOMAINS.test(host)) return 'podcast';
  return 'article';
}

/** Rozsądna wartość startowa pola „ile”: artykuł to 1 sztuka, reszta wymaga wpisania. */
export function defaultTotalFor(type: LearningResourceType, unit: LearningUnit): string {
  return type === 'article' && unit === 'items' ? '1' : '';
}

export function initialFormState(today: string, link?: SavedLink | null): AssignmentFormState {
  const resourceType = link ? guessResourceType(link) : 'book';
  const unit = DEFAULT_UNIT_BY_TYPE[resourceType];
  return {
    title: link?.title ?? '',
    resourceType,
    unit,
    total: defaultTotalFor(resourceType, unit),
    dueDate: monthEndOf(today),
    skillId: '',
    linkId: link?.id ?? null,
  };
}

export function validateAssignmentForm(
  form: AssignmentFormState,
  today: string,
  monthStart: string,
  position: number,
): AssignmentFormResult {
  const title = form.title.trim();
  if (!title) return { ok: false, error: 'Wpisz tytuł materiału.' };
  if (title.length > 200) return { ok: false, error: 'Tytuł jest za długi (max 200 znaków).' };

  if (!/^\d{1,4}$/.test(form.total.trim())) return { ok: false, error: 'Wpisz, ile tego jest (liczba całkowita).' };
  const total = Number(form.total);
  if (total < 1 || total > MAX_TOTAL) return { ok: false, error: `Ilość musi być od 1 do ${MAX_TOTAL}.` };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)) return { ok: false, error: 'Wybierz termin.' };
  if (form.dueDate < today) return { ok: false, error: 'Termin nie może być w przeszłości.' };
  if (form.dueDate < monthStart) return { ok: false, error: 'Termin musi być w tym miesiącu lub później.' };

  return {
    ok: true,
    value: {
      monthStart,
      title,
      resourceType: form.resourceType,
      unit: form.unit,
      total,
      dueDate: form.dueDate,
      linkId: form.linkId,
      skillId: form.skillId || null,
      position,
    },
  };
}
