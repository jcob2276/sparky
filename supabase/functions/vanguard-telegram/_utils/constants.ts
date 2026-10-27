/**
 * Shared Telegram UI constants — keyboard definitions and other static payloads.
 * Kept in a separate file to avoid circular imports between `commands.ts` and `_commands/*.ts`.
 */

export const FOOD_APP_ONLY_MESSAGE = 'Posiłki i etykiety dodawaj w aplikacji Sparky.';

export const DEFAULT_REPLY_KEYBOARD = {
  keyboard: [
    [
      { text: "＋ Zadanie" },
      { text: "📝 Notatka" }
    ],
    [
      { text: "💊 Suplement" },
      { text: "••• Więcej" }
    ]
  ],
  resize_keyboard: true,
  is_persistent: true
};
