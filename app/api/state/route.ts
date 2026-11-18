import { db, loadCtx, persistDay } from '@/lib/data';
import { overview } from '@/lib/views';
import { ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await loadCtx();
  await persistDay(ctx);
  const d = await db();
  const sent = await d.query<{ amount: string }>(
    `SELECT props->>'amount_saved' AS amount FROM events WHERE user_id = $1 AND name = 'allowance_goodnews_sent' AND props->>'demo_date' = $2 LIMIT 1`,
    [ctx.user.id, ctx.today]);
  return ok({ ...overview(ctx), goodNews: sent.length ? Number(sent[0].amount) : null });
}
