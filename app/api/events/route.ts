import { currentUserId, logEvent, loadCtx } from '@/lib/data';
import { ok, bad } from '@/lib/http';

const CLIENT_EVENTS = new Set([
  'allowance_setup_viewed', 'allowance_card_viewed', 'allowance_calendar_viewed', 'allowance_success_line_viewed',
  'allowance_explain_opened', 'allowance_goodnews_opened',
]);

/** Client-side events of the tracking plan; server-side ones are logged inside their own routes. */
export async function POST(req: Request) {
  const { name, props } = await req.json().catch(() => ({}));
  if (!CLIENT_EVENTS.has(name)) return bad('Unknown event');
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  await logEvent(uid, name, { ...(props ?? {}), demo_date: ctx.today });
  return ok({ ok: true });
}
