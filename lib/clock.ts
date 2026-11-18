import { db } from './data';

/** Moves the demo clock forward so successive demo actions keep their order. */
export async function advanceClock(uid: string, from: Date, ms: number) {
  const d = await db();
  await d.query('UPDATE users SET demo_now = $2 WHERE id = $1 AND demo_now IS NOT NULL', [uid, new Date(from.getTime() + ms).toISOString()]);
}
