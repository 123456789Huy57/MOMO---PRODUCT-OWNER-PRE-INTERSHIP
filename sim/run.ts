import { mkdirSync, writeFileSync } from 'node:fs';
import { computeDay, spendingEffect } from '../lib/engine';
import { personas } from './personas';

// Runs the real engine over 30 days for each synthetic persona and writes the results to CSV.
mkdirSync('sim/out', { recursive: true });
const rows = ['persona,date,allowance,spent_today,remaining_end,state_end,E,left'];
const summary = ['persona,days,days_used_up,days_exhausted,min_allowance,max_allowance,spending_total,bills_total,goal,end_left,goal_kept'];
for (const p of personas()) {
  let usedUp = 0, exhausted = 0, min = Infinity, max = 0;
  for (let d = 1; d <= 30; d++) {
    const date = `2026-11-${String(d).padStart(2, '0')}`;
    const r = computeDay(p.plan, p.txs, p.estimates, date);
    rows.push([p.id, date, r.allowance, r.spentToday, r.remaining, r.state, r.E, r.left].join(','));
    if (r.state === 'usedup') usedUp++;
    if (r.state === 'exhausted') exhausted++;
    min = Math.min(min, r.allowance); max = Math.max(max, r.allowance);
  }
  const bills = p.txs.filter((t) => t.billId).reduce((s, t) => s + t.amount, 0);
  const spend = p.txs.filter((t) => !t.billId).reduce((s, t) => s + spendingEffect(t), 0);
  const endLeft = p.plan.budget - p.plan.goal - spend - bills;
  summary.push([p.id, 30, usedUp, exhausted, min, max, spend, bills, p.plan.goal, endLeft, endLeft >= 0].join(','));
}
writeFileSync('sim/out/simulation.csv', rows.join('\n') + '\n');
writeFileSync('sim/out/summary.csv', summary.join('\n') + '\n');
console.log(summary.join('\n'));
