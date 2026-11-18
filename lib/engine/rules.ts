import type { EstimateRange, Plan, Transaction, WeeklyEstimate } from './types';
import { addDays, vnDate } from './time';

/**
 * Signed effect of a transaction on counted spending.
 * BR01: top-ups, withdrawals and transfers between own accounts are not spending.
 * BR02: refunds reduce counted spending on the day they arrive.
 * BR03: transfers to other people count unless marked "not spending".
 * BR04: Ví Trả Sau payments count as spending.
 */
export function spendingEffect(tx: Transaction): number {
  switch (tx.type) {
    case 'topup':
    case 'withdraw':
    case 'transfer_own':
      return 0;
    case 'refund':
      return -tx.amount;
    case 'transfer_out':
      return tx.notSpending ? 0 : tx.amount;
    case 'payment':
    case 'paylater':
    case 'manual':
      return tx.amount;
  }
}

/** BR05: a payment that settles a kept recurring bill is a bill payment, not day-to-day spending. */
export function isKeptBillPayment(tx: Transaction, plan: Plan | null): boolean {
  if (!plan || !tx.billId) return false;
  return plan.bills.some((b) => b.kept && b.billId === tx.billId);
}

/** BR11: midpoint of the chosen weekly range, in dong per week. */
export const RANGE_MIDPOINT: Record<EstimateRange, number> = {
  none: 0,
  under200: 100_000,
  '200to500': 350_000,
  '500to1000': 750_000,
};

/**
 * BR11: the daily reserve E is the midpoint of the chosen weekly range divided by
 * seven. An answer given on a Sunday applies to the next seven days; if the next
 * Sunday is skipped, E falls back to zero.
 */
export function reserveFor(date: string, estimates: WeeklyEstimate[]): number {
  let latest: WeeklyEstimate | null = null;
  for (const e of estimates) {
    if (e.answeredOn < date && (!latest || e.answeredOn > latest.answeredOn)) latest = e;
  }
  if (!latest) return 0;
  if (date > addDays(latest.answeredOn, 7)) return 0;
  return Math.floor(RANGE_MIDPOINT[latest.range] / 7);
}

/** BR12: eligible with at least 15 MoMo payments in the last 30 days. */
export function isEligible(txs: Transaction[], today: string, min = 15): boolean {
  const from = addDays(today, -30);
  const n = txs.filter((t) => {
    const d = vnDate(t.occurredAt);
    return t.source === 'momo' && (t.type === 'payment' || t.type === 'paylater') && d >= from && d < today;
  }).length;
  return n >= min;
}

/** BR13: the savings goal cannot exceed half of the monthly budget. */
export function validateGoal(budget: number, goal: number): string | null {
  if (!Number.isInteger(budget) || budget <= 0) return 'Ngân sách phải lớn hơn 0';
  if (!Number.isInteger(goal) || goal < 0) return 'Mục tiêu để dành không hợp lệ';
  if (goal > budget / 2) return 'Mục tiêu để dành tối đa bằng một nửa ngân sách';
  return null;
}
