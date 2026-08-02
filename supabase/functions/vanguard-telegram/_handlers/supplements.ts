import { safeSendTelegram } from "../_utils/helpers.ts";
import { answerCallbackQuery, editMessageText } from "../../_shared/telegram.ts";
import { getWarsawDateString } from "../../_shared/time.ts";

type SupplementItem = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  unit: string | null;
  skip_qty: boolean;
};

export async function handleSuplementCommand(
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
): Promise<void> {
  const { data: supls, error } = await supabase
    .from('supplements')
    .select('id, slug, name, emoji, unit, skip_qty')
    .eq('user_id', vanguardUserId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !supls || supls.length === 0) {
    await safeSendTelegram(chatId, '💊 Brak aktywnych suplementów w bazie.', telegramToken);
    return;
  }

  // Default state: qty = 1 for all active supplements
  const state: Record<string, number> = {};
  for (const s of supls) {
    state[s.slug] = 1;
  }

  const { text, inlineKeyboard } = renderSupplementMenu(supls, state);

  await safeSendTelegram(chatId, text, telegramToken, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

export function isSupplementCallback(data: string): boolean {
  return data.startsWith('supl_');
}

export async function handleSupplementCallback(
  data: string,
  chatId: number,
  messageId: number,
  callbackId: string,
  supabase: any,
  telegramToken: string,
  vanguardUserId: string,
  callbackQuery?: any,
): Promise<void> {
  const { data: supls, error: fetchErr } = await supabase
    .from('supplements')
    .select('id, slug, name, emoji, unit, skip_qty')
    .eq('user_id', vanguardUserId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (fetchErr || !supls || supls.length === 0) {
    await answerCallbackQuery(telegramToken, callbackId, { text: '⚠️ Nie znaleziono suplementów' });
    return;
  }

  if (data === 'supl_cancel') {
    await answerCallbackQuery(telegramToken, callbackId, { text: 'Anulowano' });
    await editMessageText(telegramToken, chatId, messageId, '• Anulowano wybór suplementów.', []);
    return;
  }

  if (data.startsWith('supl_s_') || data.startsWith('supl_q_')) {
    await handleLegacyCallback(data, chatId, messageId, callbackId, supabase, telegramToken, vanguardUserId);
    return;
  }

  const existingKeyboard = callbackQuery?.message?.reply_markup?.inline_keyboard || [];
  const state = parseStateFromKeyboard(existingKeyboard, supls);

  if (data === 'supl_reset') {
    for (const s of supls) state[s.slug] = 0;
    await answerCallbackQuery(telegramToken, callbackId, { text: 'Wyczyszczono' });
  } else if (data === 'supl_all') {
    for (const s of supls) state[s.slug] = 1;
    await answerCallbackQuery(telegramToken, callbackId, { text: 'Zaznaczono wszystkie' });
  } else if (data.startsWith('supl_i:')) {
    const slug = data.split(':')[1];
    if (slug && state[slug] !== undefined) {
      state[slug] = Math.min(50, state[slug] + 1);
    }
    await answerCallbackQuery(telegramToken, callbackId);
  } else if (data.startsWith('supl_d:')) {
    const slug = data.split(':')[1];
    if (slug && state[slug] !== undefined) {
      state[slug] = Math.max(0, state[slug] - 1);
    }
    await answerCallbackQuery(telegramToken, callbackId);
  } else if (data.startsWith('supl_t:')) {
    const slug = data.split(':')[1];
    if (slug && state[slug] !== undefined) {
      state[slug] = state[slug] > 0 ? 0 : 1;
    }
    await answerCallbackQuery(telegramToken, callbackId);
  } else if (data === 'supl_save') {
    const itemsToLog = supls.filter(s => (state[s.slug] || 0) > 0);
    if (itemsToLog.length === 0) {
      await answerCallbackQuery(telegramToken, callbackId, { text: '⚠️ Zaznacz przynajmniej 1 suplement' });
      return;
    }

    const today = getWarsawDateString();
    const rows = itemsToLog.map(s => ({
      user_id: vanguardUserId,
      supplement_id: s.id,
      quantity: state[s.slug] || 1,
      date: today,
    }));

    const { error: insertErr } = await supabase.from('supplement_logs').insert(rows);
    if (insertErr) {
      console.error('[supplements] batch insert failed:', insertErr.message);
      await answerCallbackQuery(telegramToken, callbackId, { text: '❌ Błąd zapisu' });
      return;
    }

    await answerCallbackQuery(telegramToken, callbackId, { text: 'Zapisano!' });

    const summaryLines = itemsToLog.map(s => {
      const qty = state[s.slug] || 1;
      const isSkipQty = s.skip_qty || s.slug === 'kreatyna' || s.name.toLowerCase().includes('kreatyna');
      const unitStr = (s.slug === 'kreatyna' || s.name.toLowerCase().includes('kreatyna')) ? '5g' : (s.unit || 'porcja');
      return isSkipQty
        ? `• ${s.emoji || '💊'} **${s.name}**: ${unitStr}`
        : `• ${s.emoji || '💊'} **${s.name}**: ${qty}x ${unitStr}`;
    });

    const summaryText = `✓ **Zapisano suplementy** (${today})\n\n${summaryLines.join('\n')}`;
    await editMessageText(telegramToken, chatId, messageId, summaryText, [], { direct: true });
    return;
  }

  const { text, inlineKeyboard } = renderSupplementMenu(supls, state);
  await editMessageText(telegramToken, chatId, messageId, text, inlineKeyboard, { direct: true });
}

function parseStateFromKeyboard(inlineKeyboard: any[], supls: SupplementItem[]): Record<string, number> {
  const state: Record<string, number> = {};
  for (const s of supls) {
    state[s.slug] = 1;
  }

  if (!Array.isArray(inlineKeyboard)) return state;

  for (const row of inlineKeyboard) {
    if (!Array.isArray(row)) continue;
    for (const btn of row) {
      if (typeof btn?.callback_data === 'string' && btn.callback_data.startsWith('supl_t:')) {
        const parts = btn.callback_data.split(':');
        if (parts.length >= 3) {
          const slug = parts[1];
          const qty = parseInt(parts[2], 10);
          if (slug && !isNaN(qty)) {
            state[slug] = qty;
          }
        }
      }
    }
  }
  return state;
}

function renderSupplementMenu(supls: SupplementItem[], state: Record<string, number>) {
  const keyboard: any[][] = [];
  const selectedSummary: string[] = [];

  for (const s of supls) {
    const qty = state[s.slug] ?? 1;
    const isSelected = qty > 0;
    const emoji = s.emoji || '💊';
    const isSkipQty = s.skip_qty || s.slug === 'kreatyna' || s.name.toLowerCase().includes('kreatyna');
    const unitStr = (s.slug === 'kreatyna' || s.name.toLowerCase().includes('kreatyna')) ? '5g' : (s.unit || 'porcja');

    if (isSelected) {
      if (isSkipQty) {
        selectedSummary.push(`• ${emoji} **${s.name}**: ${unitStr}`);
      } else {
        selectedSummary.push(`• ${emoji} **${s.name}**: ${qty}x ${unitStr}`);
      }
    }

    if (isSkipQty) {
      keyboard.push([
        {
          text: isSelected ? `✅ ${emoji} ${s.name} (${unitStr})` : `⚪️ ${emoji} ${s.name}`,
          callback_data: `supl_t:${s.slug}:${qty}`,
        },
      ]);
    } else {
      keyboard.push([
        { text: '➖', callback_data: `supl_d:${s.slug}:${qty}` },
        {
          text: isSelected ? `${emoji} ${s.name} (${qty}x)` : `⚪️ ${s.name} (0)`,
          callback_data: `supl_t:${s.slug}:${qty}`,
        },
        { text: '➕', callback_data: `supl_i:${s.slug}:${qty}` },
      ]);
    }
  }

  const selectedCount = supls.filter(s => (state[s.slug] || 0) > 0).length;

  keyboard.push([
    {
      text: selectedCount > 0 ? `⚡️ Zapisz wybrane (${selectedCount})` : '⚠️ Wybierz suplementy',
      callback_data: 'supl_save',
    },
  ]);

  keyboard.push([
    { text: '🧹 Wyczyść', callback_data: 'supl_reset' },
    { text: '🔄 Zaznacz wszystkie', callback_data: 'supl_all' },
    { text: '❌ Anuluj', callback_data: 'supl_cancel' },
  ]);

  let text = `💊 **Zaloguj suplementy**\n\n`;
  if (selectedSummary.length > 0) {
    text += `**Do zapisania:**\n${selectedSummary.join('\n')}\n\n`;
  } else {
    text += `_Brak zaznaczonych suplementów (wybierz dawkę poniżej)._\n\n`;
  }
  text += `_Zaznacz suplementy i kliknij Zapisz:_`;

  return { text, inlineKeyboard: keyboard };
}

async function handleLegacyCallback(
  data: string,
  chatId: number,
  messageId: number,
  callbackId: string,
  supabase: any,
  telegramToken: string,
  vanguardUserId: string,
): Promise<void> {
  if (data.startsWith('supl_s_')) {
    const slug = data.slice('supl_s_'.length);
    const { data: supl } = await supabase
      .from('supplements')
      .select('*')
      .eq('user_id', vanguardUserId)
      .eq('slug', slug)
      .maybeSingle();

    if (!supl) {
      await answerCallbackQuery(telegramToken, callbackId, { text: '⚠️ Nieznany suplement' });
      return;
    }

    const today = getWarsawDateString();
    await supabase.from('supplement_logs').insert({
      user_id: vanguardUserId,
      supplement_id: supl.id,
      quantity: 1,
      date: today,
    });
    await answerCallbackQuery(telegramToken, callbackId, { text: 'Zalogowano!' });
    await editMessageText(
      telegramToken,
      chatId,
      messageId,
      `✓ Zapisano suplement\n\n${supl.name}\n1 ${supl.unit || 'porcja'}`,
    );
  }
}

