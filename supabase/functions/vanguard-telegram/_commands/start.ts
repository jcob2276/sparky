import { safeSendTelegram } from "../_utils/helpers.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import type { TelegramRouterContext } from "../_router/config.ts";

export async function handleStartMenuCommand(chatId: number, telegramToken: string): Promise<void> {
  await safeSendTelegram(chatId, "Witaj w Sparky! Wybierz opcję z menu poniżej lub pisz bezpośrednio do strumienia. /trening pokazuje plan i gotowość na dziś.", telegramToken, {
    reply_markup: DEFAULT_REPLY_KEYBOARD
  });
}
