import type { TelegramRouterContext } from "./config.ts";
import { answerCallbackQuery, clearInlineKeyboard, editMessageText } from "../../_shared/telegram.ts";
import { safeSendTelegram } from "../_utils/helpers.ts";

import {
  ANALYSIS_ACTION_CALLBACKS,
  handleAnalysisActionCallback,
} from "../_handlers/antiAnalysis.ts";
import {
  handleFeedbackCallback,
  isFeedbackCallback,
} from "../_handlers/feedback.ts";
import {
  handleClosureCallback,
  isClosureCallback,
} from "../_handlers/closureProposal.ts";
import {
  handlePatternFeedbackCallback,
  isPatternFeedbackCallback,
} from "../_handlers/patternFeedback.ts";
import {
  handleSupplementCallback,
  isSupplementCallback,
} from "../_handlers/supplements.ts";
import {
  handleFoodMealCallback,
  isFoodMealCallback,
} from "../_handlers/foodMeal.ts";
import {
  handleTodoCaptureCallback,
  isTodoCaptureCallback,
} from "../_handlers/todoCapture.ts";
import {
  handleNoteStreamCallback,
  isNoteStreamCallback,
} from "../_handlers/noteStreamCallbacks.ts";

type CallbackQuery = {
  id: string;
  data: string;
  message: {
    chat: { id: number };
    message_id: number;
    text?: string;
    reply_to_message?: { text?: string };
  };
};

export async function handleCallbackQuery(
  callbackQuery: CallbackQuery,
  ctx: TelegramRouterContext,
): Promise<void> {
  const { id: callbackId, data, message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const { supabase, telegramToken, vanguardUserId } = ctx;

  if (data.startsWith("contract_")) {
    const { answerCallbackQuery, editMessageText } = await import("../../_shared/infra/telegram/send.ts");
    if (data === "contract_done") {
      await answerCallbackQuery(telegramToken, callbackId, { text: "✅ Odnotowano wykonanie!" });
      await editMessageText(telegramToken, chatId, messageId, "🎯 Zobowiązanie: Wykonano pomyślnie. Czyste zamknięcie.");
    } else if (data === "contract_snooze_60") {
      await answerCallbackQuery(telegramToken, callbackId, { text: "⏳ Przełożono o 1h" });
      await editMessageText(telegramToken, chatId, messageId, "🎯 Zobowiązanie: Przełożone o 1 godzinę.");
      const snoozeTarget = new Date(Date.now() + 60 * 60 * 1000);
      await supabase.from("outbound_messages").insert({
        user_id: vanguardUserId,
        chat_id: chatId,
        payload: {
          method: "sendMessage",
          body: {
            chat_id: chatId,
            text: "🎯 Zobowiązanie (po przełożeniu):\nStatus wykonania:",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Zrobione", callback_data: "contract_done" },
                  { text: "⏳ +1h", callback_data: "contract_snooze_60" },
                  { text: "🛑 Odpuść świadomie", callback_data: "contract_drop" }
                ]
              ]
            }
          }
        },
        send_after: snoozeTarget.toISOString(),
        status: "pending",
        priority: 10,
        dedupe_key: `contract_snooze_${chatId}_${Date.now()}`
      });
    } else if (data === "contract_drop") {
      await answerCallbackQuery(telegramToken, callbackId, { text: "🛑 Świadomie odpuszczone" });
      await editMessageText(telegramToken, chatId, messageId, "🎯 Zobowiązanie: Świadomie odpuszczone. Zero poczucia winy.");
    }
    return;
  }

  if (isTodoCaptureCallback(data)) {
    await handleTodoCaptureCallback(data, chatId, messageId, callbackId, supabase, telegramToken, vanguardUserId);
    return;
  }

  if (isFoodMealCallback(data)) {
    await handleFoodMealCallback(
      data,
      chatId,
      messageId,
      callbackId,
      supabase,
      telegramToken,
      vanguardUserId,
    );
    return;
  }

  if (isSupplementCallback(data)) {
    await handleSupplementCallback(
      data,
      chatId,
      messageId,
      callbackId,
      supabase,
      telegramToken,
      vanguardUserId,
      callbackQuery,
    );
    return;
  }

  if (ANALYSIS_ACTION_CALLBACKS.includes(data)) {
    await handleAnalysisActionCallback(
      data,
      chatId,
      messageId,
      callbackId,
      telegramToken,
    );
    return;
  }

  if (isPatternFeedbackCallback(data)) {
    await handlePatternFeedbackCallback(
      data,
      message,
      chatId,
      callbackId,
      ctx,
    );
    return;
  }

  if (isFeedbackCallback(data)) {
    await handleFeedbackCallback(
      data,
      message,
      chatId,
      callbackId,
      ctx,
    );
    return;
  }

  if (isClosureCallback(data)) {
    await handleClosureCallback(
      data,
      chatId,
      messageId,
      callbackId,
      supabase,
      telegramToken,
    );
    return;
  }

  if (data.startsWith("save_claim_")) {
    const { handleSaveClaimCallback } = await import("../_handlers/saveClaim.ts");
    await handleSaveClaimCallback(
      data,
      chatId,
      messageId,
      callbackId,
      supabase,
      telegramToken,
      vanguardUserId,
    );
    return;
  }

  if (data.startsWith("more_action:")) {
    const action = data.substring("more_action:".length);
    await answerCallbackQuery(telegramToken, callbackId);
    
    if (action === "lenie") {
      const { handleInteractivePromptCommand } = await import("../_commands/interactive.ts");
      await handleInteractivePromptCommand("🛋️ lenie", chatId, telegramToken);
    } else if (action === "post") {
      const { handleInteractivePromptCommand } = await import("../_commands/interactive.ts");
      await handleInteractivePromptCommand("⏳ post", chatId, telegramToken);
    } else if (action === "dieta") {
      const { handleDietaCommand } = await import("../_commands/dieta.ts");
      await handleDietaCommand(chatId, telegramToken, ctx.supabaseUrl, ctx.supabaseServiceRoleKey, vanguardUserId);
    } else if (action === "wywiad") {
      const { handlePytanieCommand } = await import("../_commands/pytanie.ts");
      await handlePytanieCommand(chatId, telegramToken, ctx.supabaseUrl, ctx.supabaseServiceRoleKey);
    } else if (action === "koniec") {
      const { handleKoniecCommand } = await import("../_commands/koniec.ts");
      await handleKoniecCommand(chatId, telegramToken, ctx.supabaseUrl, ctx.supabaseServiceRoleKey);
    }
    return;
  }

  if (isNoteStreamCallback(data)) {
    await handleNoteStreamCallback(data, chatId, messageId, callbackId, ctx);
    return;
  }

  if (data.startsWith("oracle_clarify:")) {
    const msgId = parseInt(data.split(":")[1], 10);
    await answerCallbackQuery(telegramToken, callbackId);
    await safeSendTelegram(chatId, "• Zadaj pytanie Wyroczni\nNapisz swoje pytanie do Vanguard Oracle:", telegramToken, {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        selective: true,
        input_field_placeholder: "Twoje pytanie..."
      }
    });
    return;
  }

  if (data.startsWith("oracle_more:")) {
    const msgId = parseInt(data.split(":")[1], 10);
    const { data: events } = await supabase
      .from("audit_events")
      .select("id, metadata")
      .eq("user_id", vanguardUserId)
      .eq("event_type", "pending_claim_proposal")
      .eq("metadata->>telegram_message_id", msgId.toString());

    const inlineKeyboard: { text: string; callback_data: string }[][] = [
      [
        { text: "👍 Odpowiedź pomogła", callback_data: `fb_ok_${msgId}` },
        { text: "👎 Popraw mnie", callback_data: `fb_err_${msgId}` }
      ]
    ];

    if (events && events.length > 0) {
      for (const ev of events) {
        if (ev.metadata?.status === "pending" && ev.metadata?.claim?.text) {
          const claimText = ev.metadata.claim.text;
          const cleanText = claimText.length > 35 ? claimText.substring(0, 32) + "..." : claimText;
          inlineKeyboard.push([
            { text: `💾 Zapisz: "${cleanText}"`, callback_data: `save_claim_${ev.id}` }
          ]);
        }
      }
    }

    await answerCallbackQuery(telegramToken, callbackId);
    const { editMessageReplyMarkup } = await import("../../_shared/infra/telegram/send.ts");
    await editMessageReplyMarkup(telegramToken, chatId, messageId, { inline_keyboard: inlineKeyboard }, { direct: true });
    return;
  }

  console.warn("[telegram] unknown callback_data:", data);
  // Telegram shows a spinning loader on the tapped button for up to 10s if the callback
  // is never answered — always acknowledge it, even for an unrecognized action.
  await answerCallbackQuery(telegramToken, callbackId, { text: "⚠️ Nieznana akcja" });
}
