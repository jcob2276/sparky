import type { TelegramRouterContext } from '../_router/config.ts';
import { safeSendTelegram } from '../_utils/helpers.ts';
import { fetchHealthCoachContext } from '../../_shared/healthCoachContext.ts';
import { trainingConstraintsFromContext } from '../../_shared/healthCoachInputs.ts';
import { decideTraining } from '@vanguard/domain';
import { HealthPlanRepo } from '../../analyze-training-load/planRepo.ts';
import { HttpError } from '../../_shared/http.ts';

type TrainingCommandContext = Pick<TelegramRouterContext, 'supabase' | 'vanguardUserId' | 'messageId'>;

/** Uses the same context, decision and durable queue as the app; activation stays in its preview. */
export async function trainingCommandReply(ctx: TrainingCommandContext, command: string): Promise<string> {
  const context = await fetchHealthCoachContext({ supabase: ctx.supabase, userId: ctx.vanguardUserId });
  const constraints = trainingConstraintsFromContext(context);
  if (command === '/trening plan') {
    if (!context.sources.goal_kpis.value?.some(row => row.measurement_spec)) return 'Najpierw zapisz mierzalne cele w Sparky → Trening → Cele.';
    if (!ctx.messageId) throw new HttpError(400, 'Brak identyfikatora prośby. Wyślij /trening plan ponownie.');
    await new HealthPlanRepo(ctx.supabase).enqueue(ctx.vanguardUserId, `telegram:training:${ctx.messageId}`, { kind: 'generate', weeks: 4 });
    return 'Przygotowuję szkic wspólnego planu biegania i siły. Postęp, podgląd oraz zatwierdzenie znajdziesz w Sparky → Trening. Aktywny plan obowiązuje do zatwierdzenia nowego.';
  }
  const decision = decideTraining(context, { constraints });
  return [`Trening — ${decision.localDate}`,
    ...(decision.original ? [`${decision.original.name} · ${decision.original.durationMinutes} min`] : []),
    ...decision.reasons, ...decision.missing,
    ...(decision.replacement ? [`Propozycja: ${decision.replacement.name} · ${decision.replacement.durationMinutes} min. Przygotuj korektę i zatwierdź ją w Sparky → Trening.`] : []),
    'Plan i cele: Sparky → Trening. /trening plan przygotuje nowy blok do przeglądu.',
  ].join('\n');
}

export async function handleTrainingCommand(ctx: TrainingCommandContext & Pick<TelegramRouterContext, 'telegramToken'>, chatId: number, command: string): Promise<void> {
  let reply: string;
  try { reply = await trainingCommandReply(ctx, command); }
  catch (error) {
    if (error instanceof HttpError) reply = error.message;
    else { console.error('[telegram] training command failed', error); reply = 'Nie udało się odczytać danych treningowych. Spróbuj ponownie w Sparky → Trening.'; }
  }
  await safeSendTelegram(chatId, reply, ctx.telegramToken);
}
