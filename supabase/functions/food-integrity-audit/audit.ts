import { readAuditRows } from './readRows.ts';
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
const ENTITY_WINDOW_DAYS = 400;
const SUMMARY_WINDOW_DAYS = 7;
const ENTITY_KINDS = new Set(['energy_mismatch', 'placeholder_favorite', 'duplicate_entry', 'orphan_photo', 'totals_drift']);
const ENTRY_COLUMNS = 'id,date,name,amount,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,meal_type,meal_group_id,logged_at,parse_meta';

type Db = ReturnType<typeof createServiceClient>;
interface ExistingFinding { id: string; fingerprint: string; status: string; detail: Record<string, unknown> | null }
const daysAgo = (days: number) => getWarsawDateString(new Date(Date.now() - days * 86_400_000));
function check(error: { message: string } | null, label: string) {
  if (error) throw new Error(`food-integrity-audit ${label}: ${error.message}`);
}

export async function targetUsers(db: Db, ctx: { isServiceRole: boolean; userId: string | null }): Promise<string[]> {
  if (!ctx.isServiceRole) return ctx.userId ? [ctx.userId] : [];
  const rows = await readAuditRows<{ user_id: string }>((from, to) => db.from('daily_food_entries').select('user_id').gte('date', daysAgo(14)).order('id').range(from, to), 'users');
  return [...new Set(rows.map((row) => row.user_id))];
}

async function selfHeal(db: Db, userId: string, findings: IntegrityFinding[]) {
  const nowIso = new Date().toISOString();
  let quarantined = 0;
  let recomputed = 0;
  for (const finding of findings) {
    if (finding.autoFix === 'quarantine_library' && finding.entityId) {
      const { error } = await db.from('food_library')
        .update({ validation_status: 'quarantined', validation_reason: `food-integrity-audit: ${finding.message}`, validated_at: nowIso })
        .eq('id', finding.entityId).eq('user_id', userId);
      check(error, 'quarantine library');
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

/** Produkt w kwarantannie audytu, którego wartości już się zgadzają, wraca do użycia. */
async function releaseFixedLibrary(db: Db, userId: string, quarantinedIds: Set<string>, findings: IntegrityFinding[]): Promise<number> {
  const stillBad = new Set(findings.filter((finding) => finding.entityTable === 'food_library').map((finding) => finding.entityId));
  const releasable = [...quarantinedIds].filter((id) => !stillBad.has(id));
  if (!releasable.length) return 0;
  const { error } = await db.from('food_library')
    .update({ validation_status: 'unreviewed', validation_reason: null, validated_at: new Date().toISOString() })
    .eq('user_id', userId).in('id', releasable);
  check(error, 'release library');
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
  const existing = await readAuditRows<ExistingFinding>((from, to) => db.from('food_integrity_findings').select('id,fingerprint,status,detail').eq('user_id', userId).order('id').range(from, to), 'existing findings');
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

export async function auditUser(db: Db, userId: string) {
  const entityStart = daysAgo(ENTITY_WINDOW_DAYS);
  const summaryStart = daysAgo(SUMMARY_WINDOW_DAYS - 1);
  const [entries, photoRows, dayTotals, library] = await Promise.all([
    readAuditRows<AuditEntry>((from, to) => db.from('daily_food_entries').select(ENTRY_COLUMNS).eq('user_id', userId).gte('date', entityStart).lte('date', daysAgo(0)).order('id').range(from, to), 'entries'),
    readAuditRows<{ id: string; meal_group_id: string; created_at: string }>((from, to) => db.from('nutrition_meal_photos').select('id,meal_group_id,created_at').eq('user_id', userId).gte('created_at', `${entityStart}T00:00:00Z`).order('id').range(from, to),
      'photos'),
    readAuditRows<{ date: string; calories: number | null }>((from, to) => db.from('daily_nutrition').select('date,calories').eq('user_id', userId).gte('date', entityStart).lte('date', daysAgo(0)).order('date').range(from, to), 'day totals'),
    readAuditRows<AuditFavorite & { validation_status: string; validation_reason: string | null }>((from, to) => db.from('food_library').select('id,name,calories,protein,carbs,fat,validation_status,validation_reason').eq('user_id', userId).order('id').range(from, to), 'library'),
  ]);
  const visibleGroups = new Set(entries.map(entry => entry.meal_group_id));
  const unchecked = [...new Set(photoRows.map(photo => photo.meal_group_id).filter(id => !visibleGroups.has(id)))];
  const linkedOutside = new Set<string>();
  for (let i = 0; i < unchecked.length; i += 100) {
    const linked = await readAuditRows<{ meal_group_id: string }>((from, to) => db.from('daily_food_entries').select('meal_group_id').eq('user_id', userId).in('meal_group_id', unchecked.slice(i, i + 100)).order('id').range(from, to), 'photo links');
    linked.forEach(row => linkedOutside.add(row.meal_group_id));
  }
  const photos: AuditPhoto[] = photoRows.filter(photo => !linkedOutside.has(photo.meal_group_id)).map((photo) => ({ id: photo.id, meal_group_id: photo.meal_group_id, date: getWarsawDateString(new Date(photo.created_at)) }));

  const long = auditFoodData({ entries, favorites: [], photos, dayTotals });
  const week = auditFoodData({ entries: entries.filter((entry) => entry.date >= summaryStart), favorites: [], photos: [], dayTotals: [] });
  const libraryFindings = auditFoodData({ entries: [], favorites: library, photos: [], dayTotals: [] }).findings.map((finding): IntegrityFinding => ({ ...finding, entityTable: 'food_library', fingerprint: `placeholder_library:${finding.entityId}`, message: finding.message.replace('Ulubiony', 'Produkt biblioteki'), autoFix: 'quarantine_library' }));
  const findings = [
    ...libraryFindings,
    ...long.findings.filter((finding) => ENTITY_KINDS.has(finding.kind)),
    ...week.findings.filter((finding) => !ENTITY_KINDS.has(finding.kind)),
  ];

  const quarantinedLibrary = new Set(library.filter(row => row.validation_status === 'quarantined').map(row => row.id));
  const toHeal = findings.filter(finding => !(finding.autoFix === 'quarantine_library' && quarantinedLibrary.has(finding.entityId ?? '')));
  const healed = await selfHeal(db, userId, toHeal);
  // Never release quarantine imposed by a different validator just because energy now matches.
  const ownedLibrary = new Set(library.filter(row => row.validation_status === 'quarantined' && row.validation_reason?.startsWith('food-integrity-audit:')).map(row => row.id));
  const released = await releaseFixedLibrary(db, userId, ownedLibrary, libraryFindings);
  // Naprawione sumy nie są już problemem; kwarantanna zostaje widoczna, bo wartość ulubionego trzeba poprawić.
  const remaining = findings
    .filter((finding) => finding.autoFix !== 'recompute_totals')
    .map((finding) => (finding.autoFix?.startsWith('quarantine_') ? { ...finding, detail: { ...finding.detail, quarantined: true } } : finding));

  const persisted = await persistFindings(db, userId, remaining, entityStart);
  const counts = { open: remaining.length, ...persisted, ...healed, released };
  check((await db.from('food_integrity_runs').insert({
    user_id: userId, window_days: SUMMARY_WINDOW_DAYS, summary: week.summary, counts,
  })).error, 'insert run');
  return counts;
}

