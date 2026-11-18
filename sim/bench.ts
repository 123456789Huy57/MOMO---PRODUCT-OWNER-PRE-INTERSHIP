import { writeFileSync, mkdirSync } from 'node:fs';
import { computeDay, type Plan, type Transaction } from '../lib/engine';
import { rng } from './personas';

// NFR07 check for the engine alone: one nightly computation for N synthetic plans,
// each with a month of transactions. Database reads and writes are not included.
const N = Number(process.argv[2] ?? 420_000);
const r = rng(7);
const plan: Plan = { month: '2026-11', budget: 8_000_000, goal: 1_000_000, bills: [{ billId: 'b', name: 'b', dueDay: 20, amount: 600_000, kept: true }] };
// 25 transactions per user before the 16th; a pool of 1,000 histories reused across users.
const pool: Transaction[][] = Array.from({ length: 1000 }, (_, u) =>
  Array.from({ length: 25 }, (_, i) => ({ id: `${u}-${i}`, amount: Math.round((20_000 + r() * 150_000) / 1000) * 1000, type: 'payment' as const, source: 'momo' as const, occurredAt: new Date(`2026-11-${String(1 + (i % 15)).padStart(2, '0')}T12:00:00+07:00`).toISOString() })));
const t0 = performance.now();
let checksum = 0;
for (let i = 0; i < N; i++) checksum += computeDay(plan, pool[i % 1000], [], '2026-11-16').allowance;
const ms = performance.now() - t0;
const out = { users: N, total_ms: Math.round(ms), per_user_us: Math.round((ms / N) * 1000 * 10) / 10, node: process.version, checksum };
mkdirSync('sim/out', { recursive: true });
writeFileSync('sim/out/bench-engine.json', JSON.stringify(out, null, 2));
console.log(out);
