import { cookies } from 'next/headers';
import { getDb, type Db } from './db/client';
import { seed } from './seed';
import { computeDay, monthOf, vnDate, type Plan, type Transaction, type WeeklyEstimate, type EstimateRange } from './engine';

export const PERSONAS = ['trang', 'khoa', 'hanh'] as const;
export type PersonaId = (typeof PERSONAS)[number];

let seeded: Promise<void> | null = null;

export async function db(): Promise<Db> {
  const d = await getDb();
  if (!seeded) {
    seeded = (async () => {
      const [{ n }] = await d.query<{ n: number }>('SELECT count(*)::int AS n FROM users');
      if (n === 0) await seed(d);
    })();
  }
  await seeded;
  return d;
}

export async function currentUserId(): Promise<PersonaId> {
  const c = (await cookies()).get('uid')?.value;
  return (PERSONAS as readonly string[]).includes(c ?? '') ? (c as PersonaId) : 'trang';
}

export interface UserRow {
  id: string; display_name: string; persona_note: string; consent_at: string | null;
  goodnews_opt_out: boolean; sunday_opt_out: boolean; demo_now: string | null;
}

export interface Ctx {
  user: UserRow;
  now: Date;
  today: string;
  plan: (Plan & { id: number }) | null;
  txs: (Transaction & { merchant: string; category: string })[];
  estimates: WeeklyEstimate[];
  bills: { id: string; payee: string; due_day: number; amount: number }[];
}

const num = (v: unknown) => Number(v);

export async function loadCtx(uid?: string): Promise<Ctx> {
  const d = await db();
  const id = uid ?? (await currentUserId());
  const [user] = await d.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  const now = user.demo_now ? new Date(user.demo_now) : new Date();
  const today = vnDate(now);
  const month = monthOf(today);
  const [p] = await d.query<{ id: number; month: string; budget_b: string; goal_g: string; status: string }>(
    `SELECT * FROM allowance_plans WHERE user_id = $1 AND month = $2 AND status = 'active'`, [id, month]);
  const bills = (await d.query<{ id: string; payee: string; due_day: number; amount: string }>(
    'SELECT * FROM recurring_bills WHERE user_id = $1 ORDER BY due_day', [id])).map((b) => ({ ...b, amount: num(b.amount) }));
  let plan: Ctx['plan'] = null;
  if (p) {
    const pb = await d.query<{ bill_id: string; amount: string; kept: boolean }>('SELECT * FROM planned_bills WHERE plan_id = $1', [p.id]);
    plan = {
      id: p.id, month: p.month, budget: num(p.budget_b), goal: num(p.goal_g),
      bills: pb.map((b) => {
        const rb = bills.find((x) => x.id === b.bill_id)!;
        return { billId: b.bill_id, name: rb.payee, dueDay: rb.due_day, amount: num(b.amount), kept: b.kept };
      }),
    };
  }
  // Only transactions up to "now" exist from the user's point of view (demo clock).
  const rows = await d.query<{ id: string; amount: string; type: Transaction['type']; source: Transaction['source']; merchant: string; category: string; not_spending: boolean; bill_id: string | null; occurred_at: string }>(
    'SELECT * FROM transactions WHERE user_id = $1 AND occurred_at <= $2 ORDER BY occurred_at', [id, now.toISOString()]);
  const txs = rows.map((r) => ({
    id: r.id, amount: num(r.amount), type: r.type, source: r.source, merchant: r.merchant, category: r.category,
    notSpending: r.not_spending, billId: r.bill_id, occurredAt: new Date(r.occurred_at).toISOString(),
  }));
  const estimates = (await d.query<{ answered_on: string | Date; range: EstimateRange }>(
    'SELECT answered_on, range FROM weekly_estimates WHERE user_id = $1', [id]))
    .map((e) => ({ answeredOn: typeof e.answered_on === 'string' ? e.answered_on.slice(0, 10) : vnDateFromDateCol(e.answered_on), range: e.range }));
  return { user, now, today, plan, txs, estimates, bills };
}

/** DATE columns come back as JS Date at UTC midnight from some drivers. */
function vnDateFromDateCol(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function today(ctx: Ctx) {
  return computeDay(ctx.plan, ctx.txs, ctx.estimates, ctx.today);
}

export async function logEvent(userId: string, name: string, props: Record<string, unknown> = {}, atIso?: string) {
  const d = await db();
  await d.query('INSERT INTO events (user_id, name, props, at) VALUES ($1, $2, $3, $4)', [userId, name, JSON.stringify(props), atIso ?? new Date().toISOString()]);
}

/** Writes the day's row to D2 Daily allowances (the store every surface reads). */
export async function persistDay(ctx: Ctx) {
  if (!ctx.plan) return;
  const r = today(ctx);
  if (r.state === 'notsetup') return;
  const d = await db();
  await d.query(
    `INSERT INTO daily_allowances (plan_id, date, allowance_a, remaining, state, computed_at) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (plan_id, date) DO UPDATE SET allowance_a = EXCLUDED.allowance_a, remaining = EXCLUDED.remaining, state = EXCLUDED.state, computed_at = EXCLUDED.computed_at`,
    [ctx.plan.id, r.date, r.allowance, r.remaining, r.state, new Date().toISOString()]);
}
