import { logAuditEvent } from "../../../_shared/audit.ts";
import { detectRepetition, repetitionMessage, type PastEntry } from "../../../_shared/repetition.ts";
import { safeSendTelegram } from "../../_utils/helpers.ts";
import { getTodayWarsaw, WARSAW_TZ } from "@vanguard/domain";
import { MessageContext, MessageInterceptor } from "../interceptors.ts";

const LOOKBACK_DAYS = 14;
const MAX_PAST = 60;
const MIN_CURRENT_CHARS = 80;
const ALARM_EVENT = "repetition_alarm";

const warsawDate = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: WARSAW_TZ }).format(new Date(iso));

/**
 * Alarm powtórek: gdy dzisiejsza refleksja prawie powtarza wcześniejsze wpisy z Telegrama, bot mówi to wprost i zadaje jedno
 * nowe pytanie. Najwyżej raz dziennie, nigdy nie przerywa reszty obsługi wiadomości (Oracle odpowiada jak zwykle).
 */
export class RepetitionAlarmInterceptor implements MessageInterceptor {
  name = "RepetitionAlarmInterceptor";
  async handle(ctx: MessageContext): Promise<boolean> {
    try {
      const hasCommandPrefix = /^(\?|!!|##|@|poprawka:)/i.test(ctx.text.trim());
      const reflective = ctx.mode === "daily_reconciliation_response" || ctx.mode === "stream" || ctx.mode === "chat";
      if (hasCommandPrefix || !reflective || ctx.cleanText.trim().length < MIN_CURRENT_CHARS) return false;

      const today = getTodayWarsaw();
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
      const [alarmsToday, pastRes] = await Promise.all([
        ctx.supabase.from("audit_events").select("id").eq("user_id", ctx.vanguardUserId).eq("event_type", ALARM_EVENT).gte("created_at", `${today}T00:00:00+00:00`).limit(1),
        ctx.supabase.from("vanguard_stream").select("id, content, timestamp").eq("user_id", ctx.vanguardUserId).eq("source", "telegram").gte("timestamp", since).order("timestamp", { ascending: false }).limit(MAX_PAST),
      ]);
      if ((alarmsToday.data ?? []).length > 0 || pastRes.error) return false;

      const past: PastEntry[] = (pastRes.data ?? [])
        .filter((row: { id: string; content: string | null }) => row.id !== ctx.streamRecordId && row.content)
        .map((row: { content: string; timestamp: string }) => ({ date: warsawDate(row.timestamp), text: row.content }))
        .filter((entry: PastEntry) => entry.date !== today);

      const result = detectRepetition(ctx.cleanText, past);
      if (!result.repeated) return false;

      await safeSendTelegram(ctx.chatId, repetitionMessage(result, today), ctx.telegramToken);
      await logAuditEvent({ eventType: ALARM_EVENT, severity: "info", message: "Alarm powtórek refleksji", userId: ctx.vanguardUserId, metadata: { matches: result.matches, best: result.best } });
    } catch (err) {
      console.error("[RepetitionAlarmInterceptor] skipped:", err);
    }
    return false;
  }
}
