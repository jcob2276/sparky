/**
 * @function food-integrity-audit
 * @trigger pg_cron co poniedziałek 04:30 UTC + wywołanie z aplikacji (przycisk „Sprawdź teraz”)
 * @role Samoaudyt jedzenia: wpisy, ulubione, zdjęcia i sumy dnia; pewność każdego składnika; odwracalne autonaprawy
 * @reads daily_food_entries, food_favorites, nutrition_meal_photos, daily_nutrition, food_integrity_findings
 * @writes food_integrity_findings, food_integrity_runs, food_favorites, daily_nutrition
 * @consumer karta „Jakość danych” w Odżywianiu (FoodIntegrityCard)
 * @status active
 */
import { serveJson } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  auditFoodData,
  getWarsawDateString,
  type AuditEntry,
  type AuditFavorite,
  type AuditPhoto,
  type IntegrityFinding,
} from '@vanguard/domain';

/** Problemy na poziomie wpisu szukamy w dłuższym oknie; luki składników liczymy z ostatniego tygodnia. */
const ENTITY_WINDOW_DAYS = 60;
const SUMMARY_WINDOW_DAYS = 7;
const ENTITY_KINDS = new Set(['energy_mismatch', 'placeholder_favorite', 'duplicate_entry', 'orphan_photo', 'totals_drift']);
const ENTRY_COLUMNS = 'id,date,name,amount,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,meal_type,meal_group_id,logged_at,parse_meta';

type Db = ReturnType<typeof createServiceClient>;
interface Result<T> { data: T | null; error: { message: string } | null }
interface ExistingFinding { id: string; fingerprint: string; status: string; detail: Record<string, unknown> | null }

const daysAgo = (days: number) => getWarsawDateString(new Date(Date.now() - days * 86_400_000));

async function must<T extends unknown[]>(query: PromiseLike<Result<T>>, label: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`food-integrity-audit ${label}: ${error.message}`);
  return data ?? ([] as unknown[] as T);
}

function check(error: { message: string } | null, label: string) {
  if (error) throw new Error(`food-integrity-audit ${label}: ${error.message}`);
}

async function targetUsers(db: Db, ctx: { isServiceRole: boolean; userId: string | null }): Promise<string[]> {
  if (!ctx.isServiceRole) return ctx.userId ? [ctx.userId] : [];
  const rows = await must<Array<{ user_id: string }>>(
    db.from('daily_food_entries').select('user_id').gte('date', daysAgo(14)).limit(5000), 'users');
  return [...new Set(rows.map((row) => row.user_id))];
}

async function selfHeal(db: Db, userId: string, findings: IntegrityFinding[]) {
  const nowIso = new Date().toISOString();
  let quarantined = 0;
  let recomputed = 0;
  for (const finding of findings) {
    if (finding.autoFix === 'quarantine_favorite' && finding.entityId) {
      const { error } = await db.from('food_favorites')
        .update({ validation_status: 'quarantined', validation_reason: finding.message, validated_at: nowIso })
        .eq('id', finding.entityId).eq('user_id', userId);
      check(error, 'quarantine favorite');
      quarantined += 1;
    }
    if (finding.autoFix === 'recompute_totals' && finding.entityId) {
      const { error } = await db.rpc('_recompute_daily_nutrition', { p_user_id: userId, p_date: finding.entityId });
      check(error, 'recompute totals');
      recomputed += 1;
    }
  }
  return { quarantined, recomputed };
}

/** Ulubiony w kwarantannie, którego wartości już się zgadzają (poprawione przez użytkownika), wraca do użycia. */
async function releaseFixedFavorites(db: Db, userId: string, quarantinedIds: Set<string>, findings: IntegrityFinding[]): Promise<number> {
  const stillBad = new Set(findings.filter((finding) => finding.autoFix === 'quarantine_favorite').map((finding) => finding.entityId));
  const releasable = [...quarantinedIds].filter((id) => !stillBad.has(id));
  if (!releasable.length) return 0;
  const { error } = await db.from('food_favorites')
    .update({ validation_status: 'unreviewed', validation_reason: null, validated_at: new Date().toISOString() })
    .eq('user_id', userId).in('id', releasable);
  check(error, 'release favorites');
  return releasable.length;
}

function toRow(userId: string, finding: IntegrityFinding, nowIso: string) {
  return {
    user_id: userId,
    fingerprint: finding.fingerprint,
    kind: finding.kind,
    severity: finding.severity,
    entity_table: finding.entityTable,
    entity_id: finding.entityId,
    message: finding.message,
    detail: finding.detail,
    auto_fix: finding.autoFix,
    last_seen_at: nowIso,
  };
}

/** Nowe znaleziska wstawia, znane odświeża (odrzucone zostają odrzucone), a niepotwierdzone w oknie zamyka. */
async function persistFindings(db: Db, userId: string, findings: IntegrityFinding[], windowStart: string) {
  const nowIso = new Date().toISOString();
  const existing = await must<ExistingFinding[]>(
    db.from('food_integrity_findings').select('id,fingerprint,status,detail').eq('user_id', userId), 'existing findings');
  const byFingerprint = new Map(existing.map((row) => [row.fingerprint, row]));
  const current = new Set(findings.map((finding) => finding.fingerprint));

  const fresh = findings.filter((finding) => !byFingerprint.has(finding.fingerprint)).map((finding) => toRow(userId, finding, nowIso));
  if (fresh.length) check((await db.from('food_integrity_findings').insert(fresh)).error, 'insert findings');

  for (const finding of findings) {
    const known = byFingerprint.get(finding.fingerprint);
    if (!known) continue;
    const reopen = known.status === 'resolved' ? { status: 'open', resolved_at: null } : {};
    const { error } = await db.from('food_integrity_findings')
      .update({ ...toRow(userId, finding, nowIso), ...reopen }).eq('id', known.id);
    check(error, 'update finding');
  }

  let resolved = 0;
  for (const row of existing) {
    if (row.status !== 'open' || current.has(row.fingerprint)) continue;
    const date = typeof row.detail?.date === 'string' ? row.detail.date : null;
    if (date && date < windowStart) continue;
    const { error } = await db.from('food_integrity_findings').update({ status: 'resolved', resolved_at: nowIso }).eq('id', row.id);
    check(error, 'resolve finding');
    resolved += 1;
  }
  return { inserted: fresh.length, resolved };
}

async function auditUser(db: Db, userId: string) {
  const entityStart = daysAgo(ENTITY_WINDOW_DAYS);
  const summaryStart = daysAgo(SUMMARY_WINDOW_DAYS);
  const [entries, favorites, photoRows, dayTotals] = await Promise.all([
    must<AuditEntry[]>(db.from('daily_food_entries').select(ENTRY_COLUMNS).eq('user_id', userId).gte('date', entityStart), 'entries'),
    must<Array<AuditFavorite & { validation_status: string }>>(
      db.from('food_favorites').select('id,name,calories,protein,carbs,fat,validation_status').eq('user_id', userId),
      'favorites'),
    must<Array<{ id: string; meal_group_id: string; created_at: string }>>(
      db.from('nutrition_meal_photos').select('id,meal_group_id,created_at').eq('user_id', userId).gte('created_at', `${entityStart}T00:00:00Z`),
      'photos'),
    must<Array<{ date: string; calories: number | null }>>(
      db.from('daily_nutrition').select('date,calories').eq('user_id', userId).gte('date', entityStart), 'day totals'),
  ]);
  const photos: AuditPhoto[] = photoRows.map((photo) => ({ id: photo.id, meal_group_id: photo.meal_group_id, date: photo.created_at.slice(0, 10) }));

  const long = auditFoodData({ entries, favorites, photos, dayTotals });
  const week = auditFoodData({ entries: entries.filter((entry) => entry.date >= summaryStart), favorites: [], photos: [], dayTotals: [] });
  const findings = [
    ...long.findings.filter((finding) => ENTITY_KINDS.has(finding.kind)),
    ...week.findings.filter((finding) => !ENTITY_KINDS.has(finding.kind)),
  ];

  const quarantinedIds = new Set(favorites.filter((favorite) => favorite.validation_status === 'quarantined').map((favorite) => favorite.id));
  const toHeal = findings.filter((finding) => finding.autoFix !== 'quarantine_favorite' || !quarantinedIds.has(finding.entityId ?? ''));
  const healed = await selfHeal(db, userId, toHeal);
  const released = await releaseFixedFavorites(db, userId, quarantinedIds, findings);
  // Naprawione sumy nie są już problemem; kwarantanna zostaje widoczna, bo wartość ulubionego trzeba poprawić.
  const remaining = findings
    .filter((finding) => finding.autoFix !== 'recompute_totals')
    .map((finding) => (finding.autoFix === 'quarantine_favorite' ? { ...finding, detail: { ...finding.detail, quarantined: true } } : finding));

  const persisted = await persistFindings(db, userId, remaining, entityStart);
  const counts = { open: remaining.length, ...persisted, ...healed, released };
  check((await db.from('food_integrity_runs').insert({
    user_id: userId, window_days: SUMMARY_WINDOW_DAYS, summary: week.summary, counts,
  })).error, 'insert run');
  return counts;
}

Deno.serve(serveJson(async (_req, ctx) => {
  const db = ctx.supabase;
  const users = await targetUsers(db, ctx);
  const results: Array<Record<string, number>> = [];
  for (const userId of users) results.push(await auditUser(db, userId));
  return { users: users.length, results };
}));
