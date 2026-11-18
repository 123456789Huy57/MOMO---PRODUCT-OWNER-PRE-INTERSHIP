import { db } from '@/lib/data';
import { ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function GET() {
  const t = Date.now();
  const d = await db();
  await d.query('SELECT 1');
  return ok({ ok: true, dbMs: Date.now() - t, driver: process.env.DATABASE_URL ? 'neon' : 'pglite' });
}
