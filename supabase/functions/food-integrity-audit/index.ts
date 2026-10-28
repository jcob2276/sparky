/**
 * @function food-integrity-audit
 * @trigger pg_cron co poniedziałek 04:30 UTC + wywołanie z aplikacji (przycisk „Sprawdź teraz”)
 * @role Samoaudyt jedzenia: wpisy, katalog, zdjęcia i sumy dnia; pewność każdego składnika; odwracalne autonaprawy
 * @reads daily_food_entries, food_library, nutrition_meal_photos, daily_nutrition, food_integrity_findings
 * @writes food_integrity_findings, food_integrity_runs, food_library, daily_nutrition
 * @consumer karta „Jakość danych” w Odżywianiu (FoodIntegrityCard)
 * @status active
 */
import { serveJson } from '../_shared/http.ts';
import { auditUser, targetUsers } from './audit.ts';
Deno.serve(serveJson(async (_req, ctx) => {
  const db = ctx.supabase;
  const users = await targetUsers(db, ctx);
  const results: Array<Record<string, number>> = [];
  for (const userId of users) results.push(await auditUser(db, userId));
  return { users: users.length, results };
}));
