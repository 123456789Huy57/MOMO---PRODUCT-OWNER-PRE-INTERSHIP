import { currentUserId, loadCtx, logEvent } from '@/lib/data';
import { daysLeft, isEligible, spendingEffect, suggestBudget, vnDate, PRESET_BUDGETS } from '@/lib/engine';
import { ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  const month = ctx.today.slice(0, 7);
  const before = ctx.txs.filter((t) => vnDate(t.occurredAt) < ctx.today && vnDate(t.occurredAt).slice(0, 7) === month);
  const paidBills = new Set(before.filter((t) => t.billId).map((t) => t.billId));
  const suggested = suggestBudget(ctx.txs, ctx.today);
  await logEvent(uid, 'allowance_setup_viewed', { suggested, entry: 'card', demo_date: ctx.today });
  return ok({
    month,
    suggested, // FR01; null means FR02 presets
    presets: PRESET_BUDGETS,
    spentBefore: before.reduce((s, t) => s + spendingEffect(t), 0),
    daysLeft: daysLeft(ctx.today),
    eligible: isEligible(ctx.txs, ctx.today),
    bills: ctx.bills.map((b) => ({ id: b.id, payee: b.payee, dueDay: b.due_day, amount: b.amount, paid: paidBills.has(b.id) })),
  });
}
