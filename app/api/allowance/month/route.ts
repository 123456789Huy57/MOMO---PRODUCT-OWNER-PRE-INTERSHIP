import { loadCtx } from '@/lib/data';
import { monthView } from '@/lib/views';
import { ok } from '@/lib/http';
export const dynamic = 'force-dynamic';

export async function GET() {
  return ok(monthView(await loadCtx()));
}
