import { db, loadCtx, logEvent, persistDay, PERSONAS } from './data';
import { addDays, computeDay, goodNews } from './engine';

/**
 * Nightly job (BPMN TO-BE timer at 00:00): write today's row to D2 and decide
 * whether to send the good-news message (FR14) for each user with a plan.
 */
export async function runNightly(onlyUser?: string) {
  const d = await db();
  const out: { user: string; date: string; allowance: number; goodNews: number | null }[] = [];
  for (const uid of onlyUser ? [onlyUser] : PERSONAS) {
    const ctx = await loadCtx(uid);
    if (!ctx.plan) continue;
    await persistDay(ctx);
    const yesterday = computeDay(ctx.plan, ctx.txs, ctx.estimates, addDays(ctx.today, -1));
    const sent = await d.query<{ date: string }>(
      `SELECT props->>'demo_date' AS date FROM events WHERE user_id = $1 AND name = 'allowance_goodnews_sent'`, [uid]);
    const sentDates = sent.map((s) => s.date);
    let msg: { saved: number } | null = null;
    if (!sentDates.includes(ctx.today)) {
      msg = goodNews(yesterday, sentDates, ctx.today, ctx.user.goodnews_opt_out);
      if (msg) await logEvent(uid, 'allowance_goodnews_sent', { amount_saved: msg.saved, demo_date: ctx.today });
    }
    out.push({ user: uid, date: ctx.today, allowance: computeDay(ctx.plan, ctx.txs, ctx.estimates, ctx.today).allowance, goodNews: msg?.saved ?? null });
  }
  return out;
}
