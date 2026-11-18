import { loadCtx } from '@/lib/data';
import { explainView } from '@/lib/views';
import { ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function GET() {
  return ok(explainView(await loadCtx()));
}
