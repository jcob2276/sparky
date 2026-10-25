/**
 * Ocena etapów rozmowy sprzedażowej względem kryteriów (1–5). Kryteria pochodzą z `sales_playbook_criteria`
 * użytkownika, a gdy dla etapu ich brak, z `DEFAULT_PHASE_CRITERIA`. Odpowiedź modelu przechodzi walidację:
 * znany etap, wynik 1–5, tylko istniejące kryteria, cytat dowodowy musi paść w transkrypcie.
 */
import { CALL_PHASES, quoteInTranscript, type CallPhase, type TranscriptLineInput } from './callMoments.ts';

export const CALL_KINDS = ['sales', 'training', 'other'] as const;
export type CallKind = (typeof CALL_KINDS)[number];

export interface PhaseCriterion {
  /** Stabilny klucz, np. `cena.cisza_po_cenie`. */
  id: string;
  label: string;
}

export interface PhaseAssessment {
  phase: CallPhase;
  score: number;
  met: PhaseCriterion[];
  missed: PhaseCriterion[];
  /** Dosłowny cytat z transkryptu uzasadniający ocenę albo null. */
  evidence: string | null;
}

export type PhaseCriteria = Record<CallPhase, PhaseCriterion[]>;

const c = (phase: CallPhase, key: string, label: string): PhaseCriterion => ({ id: `${phase}.${key}`, label });

/** Ogólne kryteria na start; zastępowane własnymi z `sales_playbook_criteria` (notatki, kursy, oferta). */
export const DEFAULT_PHASE_CRITERIA: PhaseCriteria = {
  otwarcie: [
    c('otwarcie', 'ramy', 'Ustawione ramy rozmowy: cel, czas, plan'),
    c('otwarcie', 'zgoda_na_pytania', 'Klient zgodził się na pytania'),
    c('otwarcie', 'krotki_rapport', 'Nawiązanie kontaktu bez przeciągania'),
  ],
  potrzeby: [
    c('potrzeby', 'sytuacja_obecna', 'Poznana obecna sytuacja klienta'),
    c('potrzeby', 'problem_i_koszt', 'Pogłębiony problem: skutki i koszt jego trwania'),
    c('potrzeby', 'cel_wlasnymi_slowami', 'Klient własnymi słowami określił cel'),
    c('potrzeby', 'dopytywanie', 'Odpowiedzi dopytane, a nie tylko odhaczone'),
    c('potrzeby', 'decydent', 'Ustalone, kto podejmuje decyzję'),
  ],
  prezentacja: [
    c('prezentacja', 'powiazanie_z_celem', 'Oferta powiązana ze słowami klienta'),
    c('prezentacja', 'dowod', 'Użyty przykład lub dowód skuteczności'),
    c('prezentacja', 'sprawdzenie_zrozumienia', 'Sprawdzone, czy klient rozumie i widzi dopasowanie'),
  ],
  cena: [
    c('cena', 'wartosc_przed_cena', 'Wartość zbudowana przed podaniem ceny'),
    c('cena', 'pewne_podanie', 'Cena podana wprost, bez przepraszania'),
    c('cena', 'cisza_po_cenie', 'Po cenie zaczekano na reakcję klienta'),
    c('cena', 'opcje_platnosci', 'Przedstawione opcje płatności'),
  ],
  obiekcje: [
    c('obiekcje', 'wysluchanie', 'Obiekcja wysłuchana i dopytana o prawdziwy powód'),
    c('obiekcje', 'odpowiedz_na_powod', 'Odpowiedź dotyczy powodu, a nie hasła'),
    c('obiekcje', 'sprawdzenie_czy_zalatwione', 'Sprawdzone, czy obiekcja została załatwiona'),
  ],
  zamkniecie: [
    c('zamkniecie', 'pytanie_o_decyzje', 'Zadane wprost pytanie o decyzję'),
    c('zamkniecie', 'krok_z_data', 'Ustalony następny krok z terminem'),
    c('zamkniecie', 'podsumowanie', 'Krótkie podsumowanie ustaleń'),
  ],
};

export const callKind = (value: unknown): CallKind | null => CALL_KINDS.find((kind) => kind === value) ?? null;

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Ocena tylko dla znanych etapów (po jednej na etap); id kryteriów spoza listy są pomijane. */
export function groundPhaseAssessments(raw: unknown, transcript: TranscriptLineInput[], criteria: PhaseCriteria): PhaseAssessment[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<CallPhase>();
  return raw.flatMap((item): PhaseAssessment[] => {
    const m = (item ?? {}) as Record<string, unknown>;
    const phase = CALL_PHASES.find((p) => p === m.phase);
    const score = Math.round(Number(m.score));
    if (!phase || seen.has(phase) || !Number.isFinite(score) || score < 1 || score > 5) return [];
    const known = new Map(criteria[phase].map((criterion) => [criterion.id, criterion]));
    const pick = (ids: unknown): PhaseCriterion[] => {
      if (!Array.isArray(ids)) return [];
      const unique = [...new Set(ids.filter((id): id is string => typeof id === 'string'))];
      return unique.flatMap((id) => known.get(id) ?? []);
    };
    const met = pick(m.met);
    const missed = pick(m.missed).filter((criterion) => !met.some((ok) => ok.id === criterion.id));
    if (!met.length && !missed.length) return [];
    seen.add(phase);
    const evidence = asText(m.evidence);
    return [{ phase, score, met, missed, evidence: evidence && quoteInTranscript(evidence, transcript) ? evidence : null }];
  });
}
