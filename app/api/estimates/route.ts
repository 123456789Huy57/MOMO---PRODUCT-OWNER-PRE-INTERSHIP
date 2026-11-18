import { currentUserId, db, loadCtx, logEvent } from '@/lib/data';
import { RANGE_MIDPOINT, type EstimateRange } from '@/lib/engine';
import { bad, ok } from '@/lib/http';

/** FR13 / BR11: weekly estimate of off-MoMo spending. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  if (body?.skipped === true) {
    await logEvent(uid, 'allowance_estimate_answered', { range: 'skipped', demo_date: ctx.today });
    return ok({ ok: true, reserve: 0 });
  }
  const range = body?.range as EstimateRange;
  if (!(range in RANGE_MIDPOINT)) return bad('Khoảng ước lượng không hợp lệ');
  const reserve = Math.floor(RANGE_MIDPOINT[range] / 7);
  const d = await db();
  await d.query(
    `INSERT INTO weekly_estimates (user_id, answered_on, range, reserve_e) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, answered_on) DO UPDATE SET range = EXCLUDED.range, reserve_e = EXCLUDED.reserve_e`,
    [uid, ctx.today, range, reserve]);
  await logEvent(uid, 'allowance_estimate_answered', { range, demo_date: ctx.today });
  return ok({ ok: true, reserve });
}
