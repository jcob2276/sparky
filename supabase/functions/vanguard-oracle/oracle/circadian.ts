/**
 * circadian.ts — Circadian Rhythm Engine (Lingxi / 灵犀 pattern).
 * Dynamically adjusts the agent's internal diurnal posture based on Warsaw hour
 * and biological state (Oura readiness / sleep).
 */

export interface CircadianContext {
  phase: "MORNING_FIRST_MOVE" | "DEEP_WORK_MOMENTUM" | "AFTERNOON_FRICTION_GUARD" | "EVENING_RECONCILIATION" | "NIGHT_SHUTDOWN";
  headline: string;
  instructions: string;
  biometricWarning?: string;
}

export function getCircadianStance(
  warsawHour: number,
  readinessScore?: number | null,
  sleepHours?: number | null,
): CircadianContext {
  let phase: CircadianContext["phase"] = "DEEP_WORK_MOMENTUM";
  let headline = "";
  let instructions = "";

  if (warsawHour >= 5 && warsawHour < 11) {
    phase = "MORNING_FIRST_MOVE";
    headline = "FAZA PORANNA (05:00–11:00) — Laserowy fokus na First Move";
    instructions = 
      "Pilnujesz wejścia w realizację najważniejszego zadania dnia (Top 1 / First Move). " +
      "Odcinaj jakiekolwiek ucieczki w poboczne plany, refaktory czy reorganizację. " +
      "Zadawaj krótkie, bezpośrednie pytania o rozpoczęcie pierwszego ruchu.";
  } else if (warsawHour >= 11 && warsawHour < 15) {
    phase = "DEEP_WORK_MOMENTUM";
    headline = "FAZA EGZEKUCJI I MOMENTUM (11:00–15:00) — Okno twardego nacisku";
    instructions = 
      "To kluczowe okno wykonania (diale, sprzedaż, spotkania, dowożenie). " +
      "Utrzymuj wysokie tempo i bezwzględną odpowiedzialność. " +
      "Jeśli Jakub zaczyna uciekać w kod lub teorię zamiast kontaktu ze światem — natychmiast to wskaż.";
  } else if (warsawHour >= 15 && warsawHour < 18) {
    phase = "AFTERNOON_FRICTION_GUARD";
    headline = "FAZA POPOŁUDNIOWEGO SPADKU (15:00–18:00) — Strażnik tarcia";
    instructions = 
      "Typowe okno zmęczenia dopaminowego i pokusy ucieczki (social media, rozproszenie, odpuszczanie). " +
      "Zwracaj uwagę na energię, wspieraj ruch fizyczny (trening, bieg, spacer) i pilnuj dokończenia otwartych pętli.";
  } else if (warsawHour >= 18 && warsawHour < 23) {
    phase = "EVENING_RECONCILIATION";
    headline = "FAZA WIECZORNEJ REFLEKSJI (18:00–23:00) — Zimny audyt faktów";
    instructions = 
      "Tryb spokojnego, bezstronnego podsumowania dnia. " +
      "Nie moralizujesz ani nie oceniasz. Pomóż nazwać co realnie zrobiono, jaki był największy koszt i tarcie. " +
      "Czyste domknięcie dnia bez ciągnięcia stresu do łóżka.";
  } else {
    phase = "NIGHT_SHUTDOWN";
    headline = "FAZA NOCNA (23:00–05:00) — Wyciszenie i regeneracja";
    instructions = 
      "Czas na sen i regenerację biologiczną. Żadnego planowania, analizowania ani roztrząsania problemów. " +
      "Krótki, uspokajający komunikat kierujący do odłożenia telefonu i snu.";
  }

  const warnings: string[] = [];
  if (typeof readinessScore === "number" && readinessScore > 0 && readinessScore < 65) {
    warnings.push(`⚠️ OURA ALERT: Niski wskaźnik readiness (${readinessScore}). Obniżona rezerwa adaptacyjna. Nie forsuj wielkich obciążeń ani 12h sesji — skup się wyłącznie na 1 kluczowym ruchu.`);
  }
  if (typeof sleepHours === "number" && sleepHours > 0 && sleepHours < 6.5) {
    warnings.push(`⚠️ STATYSTYKA EGZEKUCJI: Sen ${sleepHours.toFixed(1)}h (< 6.5h). W 80% przypadków egzekucja spada do <= 0.50. Zmniejszona kontrola impulsów — uprość plan do 1 rzeczy.`);
  }
  if (warsawHour >= 10 && warsawHour < 12) {
    warnings.push(`⚡ OKNO RYZYKA IMPULSU (10:00–11:30): Najwyższa podatność na ucieczkę w architekturę lub social media (opóźnienie zadań o 4-10h). Zero nowych wątków.`);
  }

  const biometricWarning = warnings.length > 0 ? warnings.join("\n") : undefined;

  return {
    phase,
    headline,
    instructions,
    biometricWarning,
  };
}
