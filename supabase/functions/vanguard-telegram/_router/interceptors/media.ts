import { sendChatAction, transcribeAudio } from "../../../_shared/telegram.ts";
import { safeSendTelegram } from "../../_utils/helpers.ts";
import { getLatestSentReconciliation } from "../../../_shared/repos/reconciliationsRepo.ts";
import { handleKeepCommand } from "../commands.ts";
import { MessageContext, MessageInterceptor, tryResumeStuckReconciliationVoice } from "../interceptors.ts";

// Whisper budget scaluje się z realną długością głosówki (Telegram ją podaje) zamiast
// jednego sztywnego limitu — krótkie nagrania failują szybko, długie dostają realny czas
// na transkrypcję. 3s przetwarzania na 1s audio to spory margines nad typowym tempem Whisper.
function transcriptionTimeoutFor(durationSec: number): number {
  return Math.min(120000, Math.max(30000, durationSec * 3000));
}

// 1. Photo handling
export class PhotoInterceptor implements MessageInterceptor {
  name = "PhotoInterceptor";
  async handle(ctx: MessageContext): Promise<boolean> {
    const photo = ctx.message.photo;
    if (photo && photo.length > 0) {
      const { handlePhotoLabel } = await import("../../_handlers/photoLabel.ts");
      await handlePhotoLabel(
        photo,
        ctx.chatId,
        ctx.telegramToken,
        ctx.openAiKey,
        ctx.vanguardUserId,
        ctx.supabase,
      );
      return true;
    }
    return false;
  }
}

// 2. Transcription handling for voice/audio
export class TranscriptionInterceptor implements MessageInterceptor {
  name = "TranscriptionInterceptor";
  async handle(ctx: MessageContext): Promise<boolean> {
    if (!ctx.isVoice) return false;

    await sendChatAction(ctx.telegramToken, ctx.chatId, "typing", { direct: true });
    const { setMessageReaction } = await import("../../../_shared/telegram.ts");
    await setMessageReaction(ctx.telegramToken, ctx.chatId, ctx.messageId, "👀", { direct: true });

    if (await tryResumeStuckReconciliationVoice(ctx.messageId, ctx.chatId, ctx)) {
      return true;
    }

    const reconciliation = await getLatestSentReconciliation(ctx.supabase, ctx.vanguardUserId);

    if (reconciliation?.created_at) {
      const ageMs = Date.now() - new Date(reconciliation.created_at).getTime();
      if (ageMs >= 0 && ageMs <= 6 * 60 * 60 * 1000) {
        ctx.pendingReconciliation = {
          id: reconciliation.id,
          date: reconciliation.date,
          mode: reconciliation.mode ?? undefined,
          parsed_response: (reconciliation.parsed_response as { mode?: string; [key: string]: unknown } | null) ?? undefined,
        };
      }
    }

    try {
      ctx.text = await transcribeAudio(
        ctx.voiceAttachment!.file_id,
        ctx.telegramToken,
        ctx.openAiKey,
        { timeoutMs: transcriptionTimeoutFor(ctx.voiceAttachment?.duration ?? 0) },
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[telegram] transcription failed:", err);
      try {
        await ctx.supabase.from("audit_events").insert({
          user_id: ctx.vanguardUserId,
          event_type: "voice_transcription_failed",
          severity: "error",
          message: `Transcription error: ${errMsg}`,
          metadata: {
            duration_sec: ctx.voiceAttachment?.duration,
            file_id: ctx.voiceAttachment?.file_id,
            stack: err instanceof Error ? err.stack : undefined,
          },
        });
      } catch (dbErr) {
        console.error("[telegram] failed to log transcription audit event:", dbErr);
      }

      await safeSendTelegram(
        ctx.chatId,
        `⚠️ Nie udało się przetworzyć głosówki (${errMsg.slice(0, 100)}). Spróbuj nagrać ponownie lub napisz tekstem.`,
        ctx.telegramToken,
      );
      return true;
    }
    ctx.cleanText = ctx.text;

    // ForceReply intercept Keep before stream recording
    const replyTo = ctx.message.reply_to_message;
    if (replyTo?.text && ctx.text) {
      if (replyTo.text.includes("Notatka") || replyTo.text.includes("Vanguard Keep")) {
        await handleKeepCommand(
          ctx.text,
          ctx.chatId,
          ctx.telegramToken,
          ctx.supabase,
          ctx.vanguardUserId,
          true,
        );
        return true;
      }
    }

    return false;
  }
}
