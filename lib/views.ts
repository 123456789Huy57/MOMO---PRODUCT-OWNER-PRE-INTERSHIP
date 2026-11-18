import type { Ctx } from './data';
import { db, today } from './data';
import {
  addDays, computeDay, dayOfMonth, isEligible, monthHistory, reserveFor, spendingEffect,
  tomorrowEstimate, unpaidBills, vnDate, weekday, RANGE_MIDPOINT,
} from './engine';

export function overview(ctx: Ctx) {
  const t = today(ctx);
  const monthTx = ctx.txs.filter((x) => vnDate(x.occurredAt).slice(0, 7) === ctx.today.slice(0, 7));
  const spentMonth = monthTx.reduce((s, x) => s + spendingEffect(x), 0);
  // Monday-first week around today.
  const wd = (weekday(ctx.today) + 6) % 7;
  const monday = addDays(ctx.today, -wd);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const known = ctx.plan && date <= ctx.today && date.slice(0, 7) === ctx.plan.month;
    const r = known ? computeDay(ctx.plan, ctx.txs, ctx.estimates, date) : null;
    return { date, day: dayOfMonth(date), label: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i], allowance: r?.allowance ?? null, today: date === ctx.today };
  });
  const upcoming = ctx.plan ? unpaidBills(ctx.plan, ctx.txs, addDays(ctx.today, 1)) : [];
  const recent = [...ctx.txs].reverse().slice(0, 5).map((x) => ({
    id: x.id, merchant: x.merchant || 'Giao dịch', amount: x.amount, type: x.type, at: x.occurredAt,
    counted: spendingEffect(x) !== 0, notSpending: !!x.notSpending,
  }));
  const isSunday = weekday(ctx.today) === 0;
  const hour = Number(new Date(ctx.now.getTime() + 7 * 3600000).toISOString().slice(11, 13));
  const answeredToday = ctx.estimates.some((e) => e.answeredOn === ctx.today);
  return {
    user: { id: ctx.user.id, name: ctx.user.display_name, note: ctx.user.persona_note },
    now: ctx.now.toISOString(),
    todayDate: ctx.today,
    card: { ...t, tomorrow: t.state === 'usedup' ? tomorrowEstimate(ctx.plan, ctx.txs, ctx.estimates, ctx.today) : null },
    eligible: isEligible(ctx.txs, ctx.today),
    month: ctx.plan ? { budget: ctx.plan.budget, goal: ctx.plan.goal, spent: spentMonth } : null,
    upcoming: upcoming.map((b) => ({ name: b.name, dueDay: b.dueDay, amount: b.amount })),
    week,
    recent,
    sundayPrompt: !!ctx.plan && isSunday && hour >= 19 && !answeredToday && !ctx.user.sunday_opt_out,
  };
}

export function monthView(ctx: Ctx) {
  if (!ctx.plan) return { days: [], today: ctx.today, month: ctx.today.slice(0, 7) };
  const days = monthHistory(ctx.plan, ctx.txs, ctx.estimates, ctx.today).map((r) => ({
    date: r.date, allowance: r.allowance, spent: r.spentToday, state: r.state,
  }));
  return { days, today: ctx.today, month: ctx.plan.month };
}

export function explainView(ctx: Ctx) {
  const t = today(ctx);
  const monthTx = ctx.txs.filter((x) => x.occurredAt && vnDate(x.occurredAt) < ctx.today && vnDate(x.occurredAt).slice(0, 7) === ctx.today.slice(0, 7));
  const viaMomo = monthTx.filter((x) => x.source === 'momo').reduce((s, x) => s + spendingEffect(x), 0);
  const added = monthTx.filter((x) => x.source === 'manual').reduce((s, x) => s + spendingEffect(x), 0);
  const est = [...ctx.estimates].sort((a, b) => (a.answeredOn < b.answeredOn ? 1 : -1))[0];
  return {
    ...t,
    viaMomo, added,
    upcoming: ctx.plan ? unpaidBills(ctx.plan, ctx.txs, ctx.today).map((b) => ({ name: b.name, dueDay: b.dueDay, amount: b.amount })) : [],
    estimate: est && reserveFor(ctx.today, ctx.estimates) > 0 ? { range: est.range, weekly: RANGE_MIDPOINT[est.range], answeredOn: est.answeredOn } : null,
  };
}

export async function funnel() {
  const d = await db();
  const rows = await d.query<{ name: string; users: number; events: number }>(
    'SELECT name, count(DISTINCT user_id)::int AS users, count(*)::int AS events FROM events GROUP BY name ORDER BY name');
  const recent = await d.query<{ user_id: string; name: string; props: unknown; at: string }>(
    'SELECT user_id, name, props, at FROM events ORDER BY id DESC LIMIT 30');
  return { rows, recent };
}
