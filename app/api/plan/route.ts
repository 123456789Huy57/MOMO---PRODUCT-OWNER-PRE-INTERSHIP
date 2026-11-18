import { currentUserId, db, loadCtx, logEvent, persistDay, today } from '@/lib/data';
import { validateGoal } from '@/lib/engine';
import { bad, isInt, ok } from '@/lib/http';

/** FR15 / BR10: change budget or goal; also notification switches and turning the feature off. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad('Thiếu dữ liệu');
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  const d = await db();
  const changes: Record<string, unknown> = {};
  if (typeof body.goodnewsOptOut === 'boolean') {
    await d.query('UPDATE users SET goodnews_opt_out = $2 WHERE id = $1', [uid, body.goodnewsOptOut]);
    changes.goodnews_opt_out = body.goodnewsOptOut;
  }
  if (typeof body.sundayOptOut === 'boolean') {
    await d.query('UPDATE users SET sunday_opt_out = $2 WHERE id = $1', [uid, body.sundayOptOut]);
    changes.sunday_opt_out = body.sundayOptOut;
  }
  if (body.off === true && ctx.plan) {
    await d.query(`UPDATE allowance_plans SET status = 'off' WHERE id = $1`, [ctx.plan.id]);
    await d.query('UPDATE users SET consent_at = NULL WHERE id = $1', [uid]);
    changes.off = true;
  }
  if (body.budget !== undefined || body.goal !== undefined) {
    if (!ctx.plan) return bad('Chưa thiết lập');
    const budget = body.budget ?? ctx.plan.budget;
    const goal = body.goal ?? ctx.plan.goal;
    if (!isInt(budget) || !isInt(goal)) return bad('Số tiền không hợp lệ');
    const err = validateGoal(budget, goal);
    if (err) return bad(err);
    await d.query('UPDATE allowance_plans SET budget_b = $2, goal_g = $3 WHERE id = $1', [ctx.plan.id, budget, goal]);
    Object.assign(changes, { old: { budget: ctx.plan.budget, goal: ctx.plan.goal }, new: { budget, goal } });
  }
  await logEvent(uid, 'allowance_settings_changed', { ...changes, demo_date: ctx.today });
  const after = await loadCtx(uid);
  await persistDay(after);
  return ok({ ok: true, today: today(after), goodnewsOptOut: after.user.goodnews_opt_out, sundayOptOut: after.user.sunday_opt_out });
}
