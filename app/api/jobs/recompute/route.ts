import { runNightly } from '@/lib/jobs';
import { bad, ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

// Vercel Cron calls GET at 17:00 UTC = 00:00 Asia/Ho_Chi_Minh (see vercel.json).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return bad('Unauthorized', 401);
  const t = performance.now();
  const result = await runNightly();
  return ok({ result, ms: Math.round(performance.now() - t) });
}
