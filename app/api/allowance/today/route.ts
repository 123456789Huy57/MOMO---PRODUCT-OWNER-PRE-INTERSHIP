import { loadCtx, today } from '@/lib/data';
import { tomorrowEstimate } from '@/lib/engine';
import { ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await loadCtx();
  const t = today(ctx);
  return ok({ ...t, tomorrow: t.state === 'usedup' ? tomorrowEstimate(ctx.plan, ctx.txs, ctx.estimates, ctx.today) : null });
}
