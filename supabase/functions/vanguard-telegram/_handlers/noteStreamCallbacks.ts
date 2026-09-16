import type { TelegramRouterContext } from "../_router/config.ts";
import { answerCallbackQuery, clearInlineKeyboard, editMessageText } from "../../_shared/telegram.ts";

export function isNoteStreamCallback(data: string): boolean {
  return (
    data.startsWith("undo:note:") ||
    data.startsWith("undo:stream:") ||
    data.startsWith("show_text:note:") ||
    data.startsWith("show_text:stream:") ||
    data.startsWith("retry_inbox:") ||
    data.startsWith("save_as_note:")
  );
}

export async function handleNoteStreamCallback(
  data: string,
  chatId: number,
  messageId: number,
  callbackId: string,
  ctx: TelegramRouterContext,
): Promise<void> {
  const { supabase, telegramToken, vanguardUserId } = ctx;

  if (data.startsWith("undo:note:")) {
    const noteId = data.slice("undo:note:".length);
    const { error } = await supabase.from("vanguard_notes").delete().eq("id", noteId).eq("user_id", vanguardUserId);
    if (error) {
      console.error("[telegram] note undo failed:", error);
      await answerCallbackQuery(telegramToken, callbackId, { text: "Nie udało się cofnąć." });
      return;
    }
    await answerCallbackQuery(telegramToken, callbackId, { text: "Cofnięto zapis notatki." });
    await editMessageText(telegramToken, chatId, messageId, "• Cofnięto", [], { direct: true });
    return;
  }

  if (data.startsWith("undo:stream:")) {
    const streamId = data.slice("undo:stream:".length);
    const { error } = await supabase.from("vanguard_stream").delete().eq("id", streamId).eq("user_id", vanguardUserId);
    if (error) {
      console.error("[telegram] stream undo failed:", error);
      await answerCallbackQuery(telegramToken, callbackId, { text: "Nie udało się cofnąć." });
      return;
    }
    await answerCallbackQuery(telegramToken, callbackId, { text: "Cofnięto zapis." });
    await editMessageText(telegramToken, chatId, messageId, "• Cofnięto", [], { direct: true });
    return;
  }

  if (data.startsWith("show_text:note:")) {
    const noteId = data.slice("show_text:note:".length);
    const { data: note, error } = await supabase.from("vanguard_notes").select("content").eq("id", noteId).maybeSingle();
    if (error || !note) {
      await answerCallbackQuery(telegramToken, callbackId, { text: "Nie znaleziono notatki." });
      return;
    }
    await answerCallbackQuery(telegramToken, callbackId);
    await editMessageText(
      telegramToken,
      chatId,
      messageId,
      `✓ Zapisano notatkę (głosowo)\n\n${note.content}`,
      [[{ text: "Cofnij", callback_data: `undo:note:${noteId}` }]],
      { direct: true }
    );
    return;
  }

  if (data.startsWith("show_text:stream:")) {
    const streamId = data.slice("show_text:stream:".length);
    const { data: stream, error } = await supabase.from("vanguard_stream").select("content").eq("id", streamId).maybeSingle();
    if (error || !stream) {
      await answerCallbackQuery(telegramToken, callbackId, { text: "Nie znaleziono zapisu." });
      return;
    }
    await answerCallbackQuery(telegramToken, callbackId);
    await editMessageText(
      telegramToken,
      chatId,
      messageId,
      `✓ Zapisano głosówkę\n\n${stream.content}`,
      [[{ text: "Cofnij", callback_data: `undo:stream:${streamId}` }]],
      { direct: true }
    );
    return;
  }

  if (data.startsWith("retry_inbox:")) {
    const recId = data.slice("retry_inbox:".length);
    const { data: record, error } = await supabase.from("vanguard_telegram_inbox").select("*").eq("id", recId).maybeSingle();
    if (error || !record) {
      await answerCallbackQuery(telegramToken, callbackId, { text: "Nie znaleziono wiadomości." });
      return;
    }
    await answerCallbackQuery(telegramToken, callbackId, { text: "Ponawiam próbę..." });
    const innerPayload = record.payload as Record<string, unknown>;
    const message = innerPayload?.message;
    if (message) {
      await clearInlineKeyboard(telegramToken, chatId, messageId);
      const { handleIncomingMessage } = await import("../_router/messages.ts");
      await handleIncomingMessage(message as never, ctx);
    }
    return;
  }

  if (data.startsWith("save_as_note:")) {
    const recId = data.slice("save_as_note:".length);
    const { data: record, error } = await supabase.from("vanguard_telegram_inbox").select("*").eq("id", recId).maybeSingle();
    if (error || !record) {
      await answerCallbackQuery(telegramToken, callbackId, { text: "Nie znaleziono wiadomości." });
      return;
    }
    await answerCallbackQuery(telegramToken, callbackId, { text: "Zapisuję jako notatkę..." });
    const innerPayload = record.payload as Record<string, unknown>;
    const message = innerPayload?.message as { text?: string } | undefined;
    if (message) {
      await clearInlineKeyboard(telegramToken, chatId, messageId);
      const textContent = message.text || "";
      const { handleKeepCommand } = await import("../_commands/keep.ts");
      await handleKeepCommand(textContent, chatId, telegramToken, supabase, vanguardUserId, false);
    }
    return;
  }
}
