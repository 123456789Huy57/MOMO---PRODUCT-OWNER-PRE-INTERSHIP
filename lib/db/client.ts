import { readFileSync } from 'node:fs';
import path from 'node:path';

// One SQL interface over two PostgreSQL drivers:
// - DATABASE_URL set  -> Neon serverless Postgres (production on Vercel)
// - otherwise         -> PGlite, Postgres compiled to WebAssembly, stored in ./.pglite (local dev, tests)

type Row = Record<string, unknown>;
export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

let dbPromise: Promise<Db> | null = null;

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    return { query: async <T,>(q: string, p: unknown[] = []) => (await sql.query(q, p)) as T[] };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.pglite');
  const pg = new PGlite(dir === 'memory' ? undefined : dir);
  await pg.waitReady;
  return { query: async <T,>(q: string, p: unknown[] = []) => (await pg.query(q, p)).rows as T[] };
}

async function migrate(db: Db) {
  const file = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  const ddl = readFileSync(file, 'utf8')
    .split('\n').map((l) => l.replace(/--.*$/, '')).join('\n')
    .split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of ddl) await db.query(stmt);
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await open();
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}
