import { parseSpending } from '@/lib/ai/parse';
import { currentUserId, loadCtx, logEvent } from '@/lib/data';
import { bad, ok } from '@/lib/http';

/** Turns a typed sentence into proposed transactions. Nothing is saved here (the user confirms first). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== 'string' || !body.text.trim()) return bad('Hãy gõ ít nhất một khoản chi');
  const result = await parseSpending(body.text, body.mode === 'rules' ? 'rules' : 'auto');
  const uid = await currentUserId();
  const ctx = await loadCtx(uid);
  await logEvent(uid, 'allowance_ai_parsed', {
    source: result.source, fallback: result.fallbackReason ?? null, items: result.items.length,
    warnings: result.warnings.length, latency_ms: result.latencyMs, chars: body.text.length, demo_date: ctx.today,
  });
  return ok(result);
}
