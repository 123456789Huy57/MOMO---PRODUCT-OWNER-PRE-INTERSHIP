import { currentUserId, db, loadCtx, logEvent, persistDay, today } from '@/lib/data';
import { bad, ok } from '@/lib/http';

/** FR12: mark a transfer to another person as "not spending" (BR03). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.notSpending !== 'boolean') return bad('Thiếu notSpending');
  const uid = await currentUserId();
  const d = await db();
  const rows = await d.query<{ type: string; amount: string }>('SELECT type, amount FROM transactions WHERE id = $1 AND user_id = $2', [id, uid]);
  if (!rows.length) return bad('Không tìm thấy giao dịch', 404);
  if (rows[0].type !== 'transfer_out') return bad('Chỉ khoản chuyển cho người khác mới đánh dấu được');
  await d.query('UPDATE transactions SET not_spending = $3 WHERE id = $1 AND user_id = $2', [id, uid, body.notSpending]);
  const ctx = await loadCtx(uid);
  await logEvent(uid, 'allowance_not_spending', { amount: Number(rows[0].amount), value: body.notSpending, demo_date: ctx.today });
  await persistDay(ctx);
  return ok(today(ctx));
}
