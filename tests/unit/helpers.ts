import type { Plan, Transaction, TxType } from '../../lib/engine';

let n = 0;
/** A transaction at a Vietnam local date and time (default 12:00). */
export function tx(date: string, amount: number, type: TxType = 'payment', extra: Partial<Transaction> = {}, time = '12:00'): Transaction {
  n += 1;
  return {
    id: 't' + n,
    amount,
    type,
    source: type === 'manual' ? 'manual' : 'momo',
    occurredAt: new Date(`${date}T${time}:00+07:00`).toISOString(),
    ...extra,
  };
}

/** The plan used throughout Part 2: budget 8,000,000đ, goal 1,000,000đ, rent on the 5th, power and internet on the 20th. */
export function part2Plan(month = '2026-11'): Plan {
  return {
    month,
    budget: 8_000_000,
    goal: 1_000_000,
    bills: [
      { billId: 'rent', name: 'Tiền nhà', dueDay: 5, amount: 3_000_000, kept: true },
      { billId: 'power', name: 'Điện', dueDay: 20, amount: 400_000, kept: true },
      { billId: 'net', name: 'Internet', dueDay: 20, amount: 200_000, kept: true },
    ],
  };
}
