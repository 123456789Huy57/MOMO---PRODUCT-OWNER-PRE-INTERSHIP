import { currentUserId, db, loadCtx, logEvent, persistDay } from '@/lib/data';
import { isEligible, validateGoal } from '@/lib/engine';
import { bad, isInt, ok } from '@/lib/http';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !isInt(body.budget) || !isInt(body.goal) || !Array.isArray(body.bills)) return bad('Thiếu thông tin thiết lập');
  if (body.consent !== true) return bad('Cần đồng ý xử lý dữ liệu trước khi bắt đầu'); // NFR06
  const err = validateGoal(body.budget, body.goal); // BR13
  if (err) return bad(err);
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  if (!isEligible(ctx.txs, ctx.today)) return bad('Tính năng đang mở cho người dùng có từ 15 giao dịch MoMo trong 30 ngày', 403); // BR12
  const d = await db();
  const month = ctx.today.slice(0, 7);
  const [{ id }] = await d.query<{ id: number }>(
    `INSERT INTO allowance_plans (user_id, month, budget_b, goal_g, status) VALUES ($1,$2,$3,$4,'active')
     ON CONFLICT (user_id, month) DO UPDATE SET budget_b = EXCLUDED.budget_b, goal_g = EXCLUDED.goal_g, status = 'active' RETURNING id`,
    [uid, month, body.budget, body.goal]);
  await d.query('DELETE FROM planned_bills WHERE plan_id = $1', [id]);
  for (const b of ctx.bills) {
    const kept = body.bills.find((x: { id: string; kept: boolean }) => x.id === b.id)?.kept ?? true;
    await d.query('INSERT INTO planned_bills (plan_id, bill_id, amount, kept) VALUES ($1,$2,$3,$4)', [id, b.id, b.amount, kept]);
  }
  await d.query('UPDATE users SET consent_at = $2 WHERE id = $1', [uid, ctx.now.toISOString()]);
  await logEvent(uid, 'allowance_setup_completed', {
    budget: body.budget, goal: body.goal, bills_kept: body.bills.filter((x: { kept: boolean }) => x.kept).length,
    edited: body.edited === true, demo_date: ctx.today,
  });
  await persistDay(await loadCtx(uid));
  return ok({ ok: true });
}
