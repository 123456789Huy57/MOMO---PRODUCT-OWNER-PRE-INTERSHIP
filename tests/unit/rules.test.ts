import { describe, expect, it } from 'vitest';
import {
  allowanceFormula, computeDay, goodNews, isEligible, reserveFor, suggestBudget, PRESET_BUDGETS,
  tomorrowEstimate, validateGoal, vnDate, floor1000, vnd,
} from '../../lib/engine';
import { offerBudgetReview } from '../../lib/engine/allowance';
import { part2Plan, tx } from './helpers';

const plan = part2Plan();
const D11 = '2026-11-11';
// Same history as the worked example: S = 4,600,000đ before day 11.
const history = () => {
  const daily = [120_000, 95_000, 200_000, 140_000, 180_000, 135_000, 260_000, 150_000, 175_000, 145_000];
  const t = daily.map((v, i) => tx(`2026-11-${String(i + 1).padStart(2, '0')}`, v));
  t.push(tx('2026-11-05', 3_000_000, 'manual', { billId: 'rent' }));
  return t;
};

describe('BR01 money moved between own accounts is not spending', () => {
  it.each(['topup', 'withdraw', 'transfer_own'] as const)('%s leaves the allowance unchanged', (type) => {
    const before = computeDay(plan, history(), [], D11);
    const after = computeDay(plan, [...history(), tx(D11, 500_000, type)], [], D11);
    expect(after.spentToday).toBe(0);
    expect(after.remaining).toBe(before.remaining);
  });
});

describe('BR02 refunds reduce counted spending on the day they arrive', () => {
  it('a refund today raises what is left today', () => {
    const r = computeDay(plan, [...history(), tx(D11, 60_000), tx(D11, 20_000, 'refund')], [], D11);
    expect(r.spentToday).toBe(40_000);
    expect(r.remaining).toBe(50_000);
  });
  it('a refund yesterday raises today’s allowance', () => {
    const r = computeDay(plan, [...history(), tx('2026-11-10', 100_000, 'refund')], [], D11);
    expect(r.S).toBe(4_500_000);
    expect(r.allowance).toBe(95_000);
  });
});

describe('BR03 transfers to other people', () => {
  it('count as spending by default', () => {
    expect(computeDay(plan, [...history(), tx(D11, 200_000, 'transfer_out')], [], D11).spentToday).toBe(200_000);
  });
  it('do not count once marked "not spending"', () => {
    expect(computeDay(plan, [...history(), tx(D11, 200_000, 'transfer_out', { notSpending: true })], [], D11).spentToday).toBe(0);
  });
});

describe('BR04 Ví Trả Sau', () => {
  it('payments count as spending', () => {
    expect(computeDay(plan, [...history(), tx(D11, 70_000, 'paylater')], [], D11).spentToday).toBe(70_000);
  });
  it('the credit limit is never part of the budget', () => {
    expect(computeDay(plan, history(), [], D11).B).toBe(8_000_000);
  });
});

describe('BR05 a recurring bill paid through MoMo is not counted twice', () => {
  it('paying the power bill on day 20 leaves the day’s remaining and the next allowance unchanged', () => {
    const txs = history();
    const before = computeDay(plan, txs, [], '2026-11-20');
    const withBill = [...txs, tx('2026-11-20', 400_000, 'payment', { billId: 'power' })];
    expect(computeDay(plan, withBill, [], '2026-11-20').remaining).toBe(before.remaining);
    expect(computeDay(plan, withBill, [], '2026-11-21').allowance).toBe(computeDay(plan, txs, [], '2026-11-21').allowance);
  });
  it('a bill the user removed in set-up counts as normal spending', () => {
    const p = { ...plan, bills: plan.bills.map((b) => (b.billId === 'net' ? { ...b, kept: false } : b)) };
    expect(computeDay(p, [...history(), tx(D11, 200_000, 'payment', { billId: 'net' })], [], D11).spentToday).toBe(200_000);
  });
});

describe('BR06 a negative amount is never shown', () => {
  it('overspending turns the card to "used up" and the allowance stays at or above zero', () => {
    const r = computeDay(plan, [...history(), tx(D11, 130_000)], [], D11);
    expect(r.state).toBe('usedup');
    expect(r.allowance).toBeGreaterThanOrEqual(0);
    expect(allowanceFormula(1_000_000, 0, 0, 0, 10, 500_000).allowance).toBe(0);
  });
});

describe('BR07 amounts are rounded down to the nearest 1,000đ', () => {
  it('87,894.7đ is shown as 87,000đ', () => {
    expect(allowanceFormula(8_000_000, 1_000_000, 4_730_000, 600_000, 19, 0).allowance).toBe(87_000);
    expect(floor1000(1999)).toBe(1000);
    expect(vnd(90000)).toBe('90.000đ');
  });
});

describe('BR08 spending above or below the allowance is spread over the remaining days', () => {
  it('overspending 40,000đ on day 11 lowers day 12 by about 40,000 ÷ 19', () => {
    const under = computeDay(plan, [...history(), tx(D11, 90_000)], [], '2026-11-12').allowance;
    const over = computeDay(plan, [...history(), tx(D11, 130_000)], [], '2026-11-12').allowance;
    expect(under - over).toBeGreaterThanOrEqual(2_000);
    expect(under - over).toBeLessThanOrEqual(3_000);
  });
});

describe('BR09 budget exhausted', () => {
  it('shows no daily amount when B − G − S − R is zero or below', () => {
    const r = computeDay(plan, [...history(), tx('2026-11-10', 1_800_000)], [], D11);
    expect(r.left).toBe(0);
    expect(r.allowance).toBe(0);
    expect(r.state).toBe('exhausted');
  });
});

describe('BR10 a plan change applies from the moment it is saved', () => {
  it('a lower goal raises today’s allowance; earlier days are recomputed only if asked', () => {
    const r = computeDay({ ...plan, goal: 500_000 }, history(), [], D11);
    expect(r.allowance).toBe(115_000);
  });
});

describe('BR11 weekly reserve for off-MoMo spending', () => {
  const est = [{ answeredOn: '2026-11-08', range: '200to500' as const }];
  it('equals the range midpoint divided by seven for the next seven days', () => {
    expect(reserveFor('2026-11-09', est)).toBe(50_000);
    expect(reserveFor('2026-11-15', est)).toBe(50_000);
    expect(computeDay(plan, history(), est, D11).allowance).toBe(40_000);
  });
  it('resets to zero when the next Sunday is skipped', () => {
    expect(reserveFor('2026-11-16', est)).toBe(0);
  });
  it('a newer answer replaces the older one', () => {
    expect(reserveFor('2026-11-16', [...est, { answeredOn: '2026-11-15', range: 'under200' }])).toBe(14_285);
  });
});

describe('BR12 eligibility', () => {
  it('needs at least 15 MoMo payments in the last 30 days', () => {
    const fourteen = Array.from({ length: 14 }, (_, i) => tx(`2026-11-${String(i + 1).padStart(2, '0')}`, 10_000));
    expect(isEligible(fourteen, '2026-11-20')).toBe(false);
    expect(isEligible([...fourteen, tx('2026-11-15', 10_000)], '2026-11-20')).toBe(true);
    expect(isEligible([...fourteen, tx('2026-11-15', 10_000, 'manual')], '2026-11-20')).toBe(false);
  });
});

describe('BR13 savings goal at most half of the budget', () => {
  it('accepts 4,000,000đ on an 8,000,000đ budget and refuses more', () => {
    expect(validateGoal(8_000_000, 4_000_000)).toBeNull();
    expect(validateGoal(8_000_000, 4_000_001)).not.toBeNull();
  });
});

describe('NFR05 day boundaries in Asia/Ho_Chi_Minh', () => {
  it('23:59 and 00:01 Vietnam time fall on different days', () => {
    expect(vnDate('2026-11-11T16:59:00Z')).toBe('2026-11-11');
    expect(vnDate('2026-11-11T17:01:00Z')).toBe('2026-11-12');
  });
  it('a payment at 23:59 counts for today, one at 00:01 for tomorrow', () => {
    const late = computeDay(plan, [...history(), tx(D11, 30_000, 'payment', {}, '23:59')], [], D11);
    const early = computeDay(plan, [...history(), tx('2026-11-12', 30_000, 'payment', {}, '00:01')], [], D11);
    expect(late.spentToday).toBe(30_000);
    expect(early.spentToday).toBe(0);
  });
});

describe('Card states', () => {
  it('normal, low below 20% and not set up', () => {
    expect(computeDay(plan, history(), [], D11).state).toBe('normal');
    expect(computeDay(plan, [...history(), tx(D11, 75_000)], [], D11).state).toBe('low');
    expect(computeDay(null, [], [], D11).state).toBe('notsetup');
  });
  it('the used-up card names tomorrow’s amount', () => {
    expect(tomorrowEstimate(plan, [...history(), tx(D11, 130_000)], [], D11)).toBe(87_000);
  });
});

describe('FR14 good-news message', () => {
  const day = computeDay(plan, [...history(), tx(D11, 63_000)], [], D11);
  it('reports the amount saved yesterday', () => {
    expect(goodNews(day, [], '2026-11-12', false)).toEqual({ saved: 27_000 });
  });
  it('is sent at most twice a week and never after opt-out', () => {
    expect(goodNews(day, ['2026-11-08', '2026-11-10'], '2026-11-12', false)).toBeNull();
    expect(goodNews(day, [], '2026-11-12', true)).toBeNull();
  });
});

describe('FR01–FR02 budget suggestion', () => {
  it('uses the median month, drops payments above the 95th percentile and rounds up to 100,000đ', () => {
    const t = [];
    for (const [m, perDay] of [['2026-08', 200_000], ['2026-09', 230_000], ['2026-10', 260_000]] as const) {
      for (let d = 1; d <= 30; d++) t.push(tx(`${m}-${String(d).padStart(2, '0')}`, perDay));
    }
    t.push(tx('2026-09-15', 20_000_000)); // one very large payment is ignored
    expect(suggestBudget(t, '2026-11-01')).toBe(6_900_000);
  });
  it('returns null with under 30 days of data, so presets are shown', () => {
    expect(suggestBudget([tx('2026-10-20', 50_000)], '2026-11-01')).toBeNull();
    expect(PRESET_BUDGETS).toHaveLength(3);
  });
});

describe('FR01 keeps recurring bills in the suggestion', () => {
  it('rent is never dropped as an outlier', () => {
    const t = [];
    for (const m of ['2026-08', '2026-09', '2026-10']) {
      for (let d = 1; d <= 30; d++) t.push(tx(`${m}-${String(d).padStart(2, '0')}`, 100_000));
      t.push(tx(`${m}-05`, 3_000_000, 'manual', { billId: 'rent' }));
    }
    expect(suggestBudget(t, '2026-11-01')).toBe(6_000_000);
  });
});

describe('BR14 budget review offer (added in Part 3)', () => {
  const day = (date: string, state: 'normal' | 'usedup') => ({ date, state }) as never;
  it('is offered after four used-up days in the last seven', () => {
    const h = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'].map((d, i) => day(d, i < 4 ? 'usedup' : 'normal'));
    expect(offerBudgetReview(h, '2026-11-11')).toBe(true);
  });
  it('is not offered after three used-up days', () => {
    const h = ['2026-11-08', '2026-11-09', '2026-11-10'].map((d) => day(d, 'usedup'));
    expect(offerBudgetReview(h, '2026-11-11')).toBe(false);
  });
});
