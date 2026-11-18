import type { Transaction } from './types';
import { spendingEffect } from './rules';
import { addDays, monthOf, vnDate } from './time';

/** FR02: preset budgets offered when there is less than 30 days of history. */
export const PRESET_BUDGETS = [3_000_000, 5_000_000, 8_000_000];

function previousMonths(month: string, n: number): string[] {
  const [y, m] = month.split('-').map(Number);
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
}

/**
 * FR01: median monthly spending of the last three full months, excluding single
 * payments above the 95th percentile, rounded up to the nearest 100,000đ.
 * Recurring bills (transactions with a billId) are never treated as outliers:
 * applied literally, FR01 would drop the rent, the largest regular payment, and
 * suggest a budget far below real spending (found while building the prototype).
 * Returns null when there is less than 30 days of data (FR02 applies).
 */
export function suggestBudget(txs: Transaction[], today: string): number | null {
  if (txs.length === 0) return null;
  const first = txs.map((t) => vnDate(t.occurredAt)).sort()[0];
  if (first > addDays(today, -30)) return null;
  const months = previousMonths(monthOf(today), 3);
  const items = txs.filter((t) => months.includes(monthOf(vnDate(t.occurredAt))) && spendingEffect(t) > 0);
  if (items.length === 0) return null;
  const dayToDay = items.filter((t) => !t.billId);
  const cut = percentile(dayToDay.map((t) => t.amount).sort((a, b) => a - b), 0.95);
  const totals = months.map((mo) =>
    items.filter((t) => monthOf(vnDate(t.occurredAt)) === mo && (t.billId || t.amount <= cut)).reduce((s, t) => s + spendingEffect(t), 0),
  );
  const sorted = [...totals].sort((a, b) => a - b);
  const median = sorted[1];
  return Math.ceil(median / 100_000) * 100_000;
}
