import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parsePokeTime } from "../../../vanguard-telegram/_commands/poke.ts";
import { qualifySqlTables } from "../../oracleSql.ts";
import { cleanLanguageGlitches } from "../../../vanguard-telegram/_utils/helpers.ts";

Deno.test("parsePokeTime — absolute HH:MM parses correctly", () => {
  const now = new Date("2026-09-17T08:00:00Z"); // 10:00 Warsaw
  const result = parsePokeTime("14:00", now);
  assertEquals(result !== null, true);
  assertEquals(result?.display, "14:00");
  // 14:00 Warsaw in summer (+2) is 12:00:00Z
  assertEquals(result?.date.toISOString().slice(11, 16), "12:00");
});

Deno.test("parsePokeTime — relative offsets 'za 2h' and 'za 30m'", () => {
  const now = new Date("2026-09-17T10:00:00.000Z");
  const res2h = parsePokeTime("za 2h", now);
  assertEquals(res2h !== null, true);
  assertEquals(res2h?.date.getTime(), now.getTime() + 2 * 60 * 60 * 1000);

  const res30m = parsePokeTime("za 30m", now);
  assertEquals(res30m !== null, true);
  assertEquals(res30m?.date.getTime(), now.getTime() + 30 * 60 * 1000);
});

Deno.test("qualifySqlTables — auto prefixes public schema for known Vanguard tables", () => {
  const q1 = "SELECT * FROM vanguard_calendar WHERE start_time >= '2026-09-17'";
  assertEquals(
    qualifySqlTables(q1),
    "SELECT * FROM public.vanguard_calendar WHERE start_time >= '2026-09-17'"
  );

  const q2 = "SELECT d.date, s.distance FROM phone_usage_daily d JOIN strava_activities s ON d.date = s.start_date";
  assertEquals(
    qualifySqlTables(q2),
    "SELECT d.date, s.distance FROM public.phone_usage_daily d JOIN public.strava_activities s ON d.date = s.start_date"
  );

  // Already prefixed — does not double prefix
  const q3 = "SELECT * FROM public.vanguard_calendar";
  assertEquals(qualifySqlTables(q3), "SELECT * FROM public.vanguard_calendar");
});

Deno.test("cleanLanguageGlitches — cleans Chinese token slips and strips fake ** bolding", () => {
  const raw = "**Ale najważniejszy ruch dnia to nie praca.**\nDlatego ustal teraz, co z会话 w trakcie wyjazdu.";
  const cleaned = cleanLanguageGlitches(raw);
  assertEquals(cleaned.includes("会话"), false);
  assertEquals(cleaned.includes("callami/sesjami"), true);
  assertEquals(cleaned.includes("**"), false);
  assertEquals(cleaned.startsWith("Ale najważniejszy ruch dnia to nie praca."), true);
});

Deno.test("sanitizeOutboundText — sanitizes outbound message text and eliminates **", async () => {
  const { sanitizeOutboundText } = await import("./send.ts");
  const raw = "• **Zapis Lenie** z 会话 oraz **Tytuł:** test";
  const cleaned = sanitizeOutboundText(raw);
  assertEquals(cleaned.includes("**"), false);
  assertEquals(cleaned.includes("会话"), false);
  assertEquals(cleaned, "• Zapis Lenie z callami/sesjami oraz Tytuł: test");
});

Deno.test("extractAnswer — returns empty string when should_respond is false (Poke noise filter)", async () => {
  const { extractAnswer } = await import("../../../vanguard-oracle/oracle/responseExtract.ts");
  const res = extractAnswer({ should_respond: false, answer: "Nie ma sprawy!" }, "Nie ma sprawy!");
  assertEquals(res, "");
});

Deno.test("getCircadianStance — adapts agent posture by diurnal phase (Lingxi pattern)", async () => {
  const { getCircadianStance } = await import("../../../vanguard-oracle/oracle/circadian.ts");
  
  // Morning phase
  const morning = getCircadianStance(9, 85, 7.5);
  assertEquals(morning.phase, "MORNING_FIRST_MOVE");
  assertEquals(morning.biometricWarning, undefined);

  // Execution / deep work phase
  const midday = getCircadianStance(13, 75, 7.0);
  assertEquals(midday.phase, "DEEP_WORK_MOMENTUM");

  // Night shutdown phase
  const night = getCircadianStance(23, 80, 8.0);
  assertEquals(night.phase, "NIGHT_SHUTDOWN");

  // Oura low readiness alert
  const alert = getCircadianStance(8, 55, 6.0);
  assertEquals(alert.biometricWarning?.includes("OURA ALERT"), true);
});


