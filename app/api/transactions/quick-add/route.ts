import { currentUserId, db, loadCtx, logEvent, persistDay, today } from '@/lib/data';
import { advanceClock } from '@/lib/clock';
import { bad, isInt, ok } from '@/lib/http';
import { CATEGORIES, CATEGORY_LABEL, MAX_AMOUNT, MAX_ITEMS, type Category } from '@/lib/ai/types';

interface Item { amount: number; label?: string; category?: string; method?: string }

/**
 * FR11: add off-MoMo spending. Accepts one amount (manual form) or a confirmed list from the
 * typed-sentence flow. Only items the user confirmed reach this endpoint.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const items: Item[] | null = Array.isArray(body?.items) ? body.items : body && isInt(body.amount) ? [{ amount: body.amount, method: body.method }] : null;
  if (!items || items.length === 0 || items.length > MAX_ITEMS) return bad('Danh sách khoản chi không hợp lệ');
  for (const it of items) if (!isInt(it.amount) || it.amount <= 0 || it.amount > MAX_AMOUNT) return bad('Số tiền không hợp lệ');
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  const d = await db();
  const stamp = Date.now();
  for (const [i, it] of items.entries()) {
    const method = it.method === 'bank' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt';
    const cat = CATEGORIES.includes(it.category as Category) ? CATEGORY_LABEL[it.category as Category] : 'Khác';
    const label = typeof it.label === 'string' && it.label.trim() ? `${it.label.trim().slice(0, 60)} (${method.toLowerCase()})` : method;
    await d.query(
      `INSERT INTO transactions (id,user_id,amount,type,source,merchant,category,occurred_at) VALUES ($1,$2,$3,'manual','manual',$4,$5,$6)`,
      [`${uid}-m${stamp}-${i}`, uid, it.amount, label, cat, ctx.now.toISOString()]);
  }
  await advanceClock(uid, ctx.now, 60_000);
  const total = items.reduce((s, it) => s + it.amount, 0);
  if (body.flow === 'sentence') {
    await logEvent(uid, 'allowance_ai_confirmed', {
      items: items.length, total, proposed: body.proposed ?? null, edited: body.edited ?? 0, removed: body.removed ?? 0,
      source: body.source ?? null, demo_date: ctx.today,
    });
  } else {
    await logEvent(uid, 'allowance_quick_add', { amount: total, method: items[0].method ?? 'cash', demo_date: ctx.today });
  }
  const after = await loadCtx(uid);
  await persistDay(after);
  return ok(today(after));
}
