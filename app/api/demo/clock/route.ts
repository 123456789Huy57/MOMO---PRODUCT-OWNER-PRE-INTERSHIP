import { cookies } from 'next/headers';
import { currentUserId, db, loadCtx, PERSONAS } from '@/lib/data';
import { runNightly } from '@/lib/jobs';
import { seed } from '@/lib/seed';
import { addDays, weekday } from '@/lib/engine';
import { bad, ok } from '@/lib/http';

const vnInstant = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();

/** Demo tools only: switch persona, move the clock, reset the data. */
export async function POST(req: Request) {
  if (process.env.DEMO_TOOLS === 'off') return bad('Demo tools are disabled', 403);
  const body = await req.json().catch(() => ({}));
  const d = await db();
  if (body.action === 'persona') {
    if (!(PERSONAS as readonly string[]).includes(body.persona)) return bad('Persona không hợp lệ');
    (await cookies()).set('uid', body.persona, { path: '/', sameSite: 'lax' });
    return ok({ ok: true });
  }
  if (body.action === 'reset') {
    await seed(d);
    return ok({ ok: true });
  }
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  if (body.action === 'next-day') {
    const next = addDays(ctx.today, 1);
    await d.query('UPDATE users SET demo_now = $2 WHERE id = $1', [uid, vnInstant(next, '08:00')]);
    const job = await runNightly(uid);
    return ok({ ok: true, date: next, job });
  }
  if (body.action === 'sunday-evening') {
    const wd = weekday(ctx.today);
    const sunday = addDays(ctx.today, wd === 0 ? 0 : 7 - wd);
    // Walk day by day so each midnight job runs, as it would in production.
    for (let day = addDays(ctx.today, 1); day <= sunday; day = addDays(day, 1)) {
      await d.query('UPDATE users SET demo_now = $2 WHERE id = $1', [uid, vnInstant(day, '08:00')]);
      await runNightly(uid);
    }
    await d.query('UPDATE users SET demo_now = $2 WHERE id = $1', [uid, vnInstant(sunday, '19:00')]);
    return ok({ ok: true, date: sunday });
  }
  return bad('Hành động không hợp lệ');
}
