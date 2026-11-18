import { describe, expect, it } from 'vitest';
import { computeDay } from '../../lib/engine';
import { part2Plan, tx } from './helpers';

// Reproduces the numbers printed in Part 2 of the report.

describe('Part 2 worked example (section 5.3)', () => {
  const plan = part2Plan();
  // Day-to-day spending on days 1-10 adds up to 1,600,000đ; rent 3,000,000đ was paid on day 5.
  const daily = [120_000, 95_000, 200_000, 140_000, 180_000, 135_000, 260_000, 150_000, 175_000, 145_000];
  const base = daily.map((v, i) => tx(`2026-11-${String(i + 1).padStart(2, '0')}`, v));
  base.push(tx('2026-11-05', 3_000_000, 'manual', { billId: 'rent' }));

  it('day 11 shows 90,000đ from 1,800,000đ over 20 days', () => {
    const r = computeDay(plan, base, [], '2026-11-11');
    expect(r.S).toBe(4_600_000);
    expect(r.R).toBe(600_000);
    expect(r.left).toBe(1_800_000);
    expect(r.D).toBe(20);
    expect(r.allowance).toBe(90_000);
  });

  it('spending 130,000đ on day 11 gives 87,000đ on day 12, and 60,000đ on day 12 gives 89,000đ on day 13', () => {
    const txs = [...base, tx('2026-11-11', 130_000)];
    expect(computeDay(plan, txs, [], '2026-11-12').allowance).toBe(87_000);
    txs.push(tx('2026-11-12', 60_000));
    expect(computeDay(plan, txs, [], '2026-11-13').allowance).toBe(89_000);
  });
});

describe('Part 2 Appendix 2: simulated month (synthetic spending data)', () => {
  // Inputs and expected morning allowances copied from Table A.1 of the report.
  const spend = [81, 103, 68, 128, 51, 180, 222, 77, 94, 60, 111, 73, 86, 359, 51, 64, 162, 197, 81, 68, 94, 60, 120, 86, 77, 137, 188, 51, 73, 60].map((k) => k * 1000);
  const shown = [113, 114, 114, 116, 116, 118, 116, 111, 113, 114, 116, 117, 119, 121, 106, 110, 113, 110, 102, 104, 108, 110, 116, 115, 120, 129, 127, 107, 135, 198].map((k) => k * 1000);

  it('the engine produces the same allowance on all 30 days', () => {
    const plan = { ...part2Plan('2026-11'), bills: [
      { billId: 'rent', name: 'Tiền nhà', dueDay: 5, amount: 3_000_000, kept: true },
      { billId: 'bills20', name: 'Điện và Internet', dueDay: 20, amount: 600_000, kept: true },
    ] };
    const txs = spend.map((v, i) => tx(`2026-11-${String(i + 1).padStart(2, '0')}`, v));
    txs.push(tx('2026-11-05', 3_000_000, 'manual', { billId: 'rent' }));
    txs.push(tx('2026-11-20', 600_000, 'payment', { billId: 'bills20' }));
    const got = shown.map((_, i) => computeDay(plan, txs, [], `2026-11-${String(i + 1).padStart(2, '0')}`).allowance);
    expect(got).toEqual(shown);
    // Goal kept intact: 8,000,000 - 1,000,000 - spending - bills = 138,000đ left at month end.
    const total = spend.reduce((a, b) => a + b, 0) + 3_600_000;
    expect(8_000_000 - 1_000_000 - total).toBe(138_000);
  });
});
