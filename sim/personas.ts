import type { Plan, Transaction, WeeklyEstimate } from '../lib/engine';

// SYNTHETIC test inputs for Part 3. Each persona exercises a group of rules; none describes real users.
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const day = (d: number) => `2026-11-${String(d).padStart(2, '0')}`;
const at = (d: number, time = '12:00') => new Date(`${day(d)}T${time}:00+07:00`).toISOString();
let n = 0;
const tx = (d: number, amount: number, extra: Partial<Transaction> = {}): Transaction =>
  ({ id: 's' + ++n, amount, type: 'payment', source: 'momo', occurredAt: at(d), ...extra });

export interface Persona { id: string; label: string; plan: Plan; txs: Transaction[]; estimates: WeeklyEstimate[] }

export function personas(): Persona[] {
  // Trang: the Appendix 2 month of Part 2 (fixed salary, rent by bank app).
  const trangSpend = [81, 103, 68, 128, 51, 180, 222, 77, 94, 60, 111, 73, 86, 359, 51, 64, 162, 197, 81, 68, 94, 60, 120, 86, 77, 137, 188, 51, 73, 60];
  const trang: Persona = {
    id: 'trang', label: 'Trang (Part 2, Appendix 2)', estimates: [],
    plan: { month: '2026-11', budget: 8_000_000, goal: 1_000_000, bills: [
      { billId: 'rent', name: 'Tiền nhà', dueDay: 5, amount: 3_000_000, kept: true },
      { billId: 'b20', name: 'Điện và Internet', dueDay: 20, amount: 600_000, kept: true }] },
    txs: [...trangSpend.map((k, i) => tx(i + 1, k * 1000)), tx(5, 3_000_000, { type: 'manual', source: 'manual', billId: 'rent' }), tx(20, 600_000, { billId: 'b20' })],
  };

  // Khoa: student, low budget, 2-5 small payments a day, one bigger week (exam books).
  const r2 = rng(202);
  const khoaTx: Transaction[] = [tx(15, 100_000, { billId: 'phone' })];
  for (let d = 1; d <= 30; d++) {
    const k = 2 + Math.floor(r2() * 4);
    for (let i = 0; i < k; i++) khoaTx.push(tx(d, Math.round((12_000 + r2() * 30_000) / 1000) * 1000));
    if (d >= 8 && d <= 10) khoaTx.push(tx(d, 150_000));
  }
  const khoa: Persona = {
    id: 'khoa', label: 'Khoa (nhiều giao dịch nhỏ, ngân sách thấp)', estimates: [],
    plan: { month: '2026-11', budget: 3_100_000, goal: 500_000, bills: [{ billId: 'phone', name: 'Cước điện thoại', dueDay: 15, amount: 100_000, kept: true }] },
    txs: khoaTx,
  };

  // Hạnh: most daily spending in cash, recorded only through the Sunday estimate; overspends in week 3.
  const r3 = rng(303);
  const hanhTx: Transaction[] = [tx(10, 2_500_000, { billId: 'school' }), tx(22, 700_000, { billId: 'power' })];
  const cashByWeek: number[] = [];
  for (let d = 1; d <= 30; d++) {
    const cash = Math.round((90_000 + r3() * 90_000 + (d >= 15 && d <= 21 ? 120_000 : 0)) / 1000) * 1000;
    // Cash is not seen by MoMo; Hạnh adds it herself only on some days.
    if (r3() < 0.5) hanhTx.push(tx(d, cash, { type: 'manual', source: 'manual' }));
    if (r3() < 0.6) hanhTx.push(tx(d, Math.round((40_000 + r3() * 120_000) / 1000) * 1000));
    const w = Math.floor((d - 1) / 7); cashByWeek[w] = (cashByWeek[w] ?? 0) + cash;
  }
  const estimates: WeeklyEstimate[] = [{ answeredOn: '2026-11-01', range: '500to1000' }, { answeredOn: '2026-11-08', range: '500to1000' }, { answeredOn: '2026-11-22', range: '500to1000' }];
  const hanh: Persona = {
    id: 'hanh', label: 'Hạnh (chi nhiều tiền mặt, bỏ qua một tuần ước lượng)', estimates,
    plan: { month: '2026-11', budget: 12_000_000, goal: 2_000_000, bills: [
      { billId: 'school', name: 'Học phí', dueDay: 10, amount: 2_500_000, kept: true },
      { billId: 'power', name: 'Điện', dueDay: 22, amount: 700_000, kept: true }] },
    txs: hanhTx,
  };
  return [trang, khoa, hanh];
}
