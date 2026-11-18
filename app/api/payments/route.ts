import { currentUserId, db, loadCtx, logEvent, persistDay, today } from '@/lib/data';
import { tomorrowEstimate } from '@/lib/engine';
import { bad, isInt, ok } from '@/lib/http';
import { advanceClock } from '@/lib/clock';

const LINE_TIMEOUT_MS = 300; // NFR03: past this the success screen shows without the line

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([p, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms))]);
}

export async function POST(req: Request) {
  const t0 = performance.now();
  const body = await req.json().catch(() => null);
  if (!body || !isInt(body.amount) || body.amount <= 0 || body.amount > 50_000_000) return bad('Số tiền không hợp lệ');
  const merchant = typeof body.merchant === 'string' ? body.merchant.slice(0, 60) : 'Cửa hàng';
  const type = body.type === 'paylater' ? 'paylater' : 'payment';
  const uid = await currentUserId();
  const before = await loadCtx(uid);
  const id = `${uid}-p${Date.now()}`;
  const d = await db();
  // 1. The payment itself (simulated). Nothing below may block or fail it.
  await d.query(
    `INSERT INTO transactions (id,user_id,amount,type,source,merchant,category,occurred_at) VALUES ($1,$2,$3,$4,'momo',$5,$6,$7)`,
    [id, uid, body.amount, type, merchant, body.category ?? 'Ăn uống', before.now.toISOString()]);
  await advanceClock(uid, before.now, 60_000);
  const paidMs = performance.now() - t0;

  // 2. The allowance engine, with a hard time limit (FR06, FR09, NFR02, NFR03).
  const t1 = performance.now();
  const engine = (async () => {
    if (body.simulateSlowEngine === true) await new Promise((r) => setTimeout(r, 600));
    const ctx = await loadCtx(uid);
    if (!ctx.plan) return null;
    await persistDay(ctx);
    const r = today(ctx);
    return { remaining: Math.max(0, r.remaining), allowance: r.allowance, state: r.state, tomorrow: r.state === 'usedup' ? tomorrowEstimate(ctx.plan, ctx.txs, ctx.estimates, ctx.today) : null };
  })();
  const line = await withTimeout(engine, LINE_TIMEOUT_MS).catch(() => 'timeout' as const);
  const engineMs = performance.now() - t1;
  if (line && line !== 'timeout') {
    await logEvent(uid, 'allowance_success_line_viewed', { remaining: line.remaining, state: line.state, payment_amount: body.amount, demo_date: before.today });
  }
  return ok({
    id, amount: body.amount, merchant, at: before.now.toISOString(),
    line: line === 'timeout' ? null : line,
    timedOut: line === 'timeout',
    timing: { paymentMs: Math.round(paidMs), engineMs: Math.round(engineMs) },
  });
}
