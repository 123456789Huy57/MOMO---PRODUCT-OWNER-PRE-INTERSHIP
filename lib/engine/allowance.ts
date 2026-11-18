import type { CardState, DayResult, Plan, Transaction, WeeklyEstimate } from './types';
import { floor1000 } from './money';
import { addDays, daysLeft, monthOf, vnDate } from './time';
import { isKeptBillPayment, reserveFor, spendingEffect } from './rules';

/** Share of today's allowance under which the card turns "low". */
export const LOW_SHARE = 0.2;

/**
 * Today's Allowance: A = max(0, (B − G − S − R) ÷ D − E), rounded down to 1,000đ.
 * BR06: never negative. BR07: rounded down. BR08 follows from S: spending above or
 * below the allowance on one day changes S, so it is spread over the days left.
 */
export function allowanceFormula(B: number, G: number, S: number, R: number, D: number, E: number) {
  const left = B - G - S - R;
  if (left <= 0 || D <= 0) return { left, allowance: 0 };
  return { left, allowance: Math.max(0, floor1000(left / D - E)) };
}

export function cardState(left: number, allowance: number, remaining: number): CardState {
  if (left <= 0) return 'exhausted'; // BR09
  if (remaining <= 0) return 'usedup'; // BR06: show "used up", never a negative number
  if (remaining < LOW_SHARE * allowance) return 'low';
  return 'normal';
}

function inMonth(tx: Transaction, month: string) {
  return monthOf(vnDate(tx.occurredAt)) === month;
}

/** Kept bills that have not been paid before the given date. */
export function unpaidBills(plan: Plan, txs: Transaction[], before: string) {
  const paid = new Set(
    txs.filter((t) => t.billId && vnDate(t.occurredAt) < before && inMonth(t, plan.month)).map((t) => t.billId),
  );
  return plan.bills.filter((b) => b.kept && !paid.has(b.billId));
}

/**
 * Computes the card for one day. Only transactions before `date` enter S; the
 * day's own transactions reduce the remaining amount (FR06).
 */
export function computeDay(
  plan: Plan | null,
  txs: Transaction[],
  estimates: WeeklyEstimate[],
  date: string,
): DayResult {
  const D = daysLeft(date);
  if (!plan || plan.month !== monthOf(date)) {
    return { date, B: 0, G: 0, S: 0, R: 0, D, E: 0, left: 0, allowance: 0, spentToday: 0, remaining: 0, state: 'notsetup' };
  }
  const monthTx = txs.filter((t) => inMonth(t, plan.month));
  const S = monthTx.filter((t) => vnDate(t.occurredAt) < date).reduce((s, t) => s + spendingEffect(t), 0);
  const R = unpaidBills(plan, monthTx, date).reduce((s, b) => s + b.amount, 0);
  const E = reserveFor(date, estimates);
  const { left, allowance } = allowanceFormula(plan.budget, plan.goal, S, R, D, E);
  const spentToday = monthTx
    .filter((t) => vnDate(t.occurredAt) === date && !isKeptBillPayment(t, plan))
    .reduce((s, t) => s + spendingEffect(t), 0);
  const remaining = allowance - spentToday;
  return { date, B: plan.budget, G: plan.goal, S, R, D, E, left, allowance, spentToday, remaining, state: cardState(left, allowance, remaining) };
}

/** Tomorrow's amount if nothing else is spent today, for the "used up" card. */
export function tomorrowEstimate(plan: Plan | null, txs: Transaction[], estimates: WeeklyEstimate[], date: string): number | null {
  const next = addDays(date, 1);
  if (!plan || monthOf(next) !== plan.month) return null;
  return computeDay(plan, txs, estimates, next).allowance;
}

/** Day-by-day allowances from day 1 of the plan's month up to `until` (for the Calendar, FR08). */
export function monthHistory(plan: Plan, txs: Transaction[], estimates: WeeklyEstimate[], until: string) {
  const out: DayResult[] = [];
  for (let d = plan.month + '-01'; d <= until && monthOf(d) === plan.month; d = addDays(d, 1)) {
    out.push(computeDay(plan, txs, estimates, d));
  }
  return out;
}

/**
 * FR14: after a day under the allowance, a good-news message with the amount saved,
 * at most twice per 7 days (the caller passes the dates already sent).
 */
export function goodNews(yesterday: DayResult, sentDates: string[], today: string, optedOut: boolean) {
  if (optedOut || yesterday.state === 'notsetup' || yesterday.allowance <= 0) return null;
  const saved = yesterday.allowance - yesterday.spentToday;
  if (saved <= 0) return null;
  const recent = sentDates.filter((d) => d > addDays(today, -7) && d <= today).length;
  if (recent >= 2) return null;
  return { saved: floor1000(saved) };
}
