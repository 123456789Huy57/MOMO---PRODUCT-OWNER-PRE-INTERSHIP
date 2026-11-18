import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseByRules } from '../lib/ai/rules';
import { currentModel, parseWithGemini } from '../lib/ai/gemini';
import { validateItems } from '../lib/ai/parse';
import type { ParsedItem } from '../lib/ai/types';

/**
 * Scores the parsers against sentences with known answers.
 *   npm run eval:ai                 rules + Gemini (needs GEMINI_API_KEY in .env.local)
 *   npm run eval:ai -- --rules-only
 *   npm run eval:ai -- --set real   only data/ai-eval/real.json
 * Requests are spaced (EVAL_DELAY_MS, default 4500) to stay inside the free-tier rate limit.
 */
if (existsSync('.env.local')) for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const args = process.argv.slice(2);
const set = args.includes('--set') ? args[args.indexOf('--set') + 1] : 'all';
const rulesOnly = args.includes('--rules-only') || !process.env.GEMINI_API_KEY;
const delay = Number(process.env.EVAL_DELAY_MS ?? 4500);

interface Case { id: string; text: string; expected: { amount: number; category: string }[]; tags: string[] }
const load = (f: string): Case[] => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).cases : []);
let cases: Case[] = [];
if (set === 'all' || set === 'synthetic') cases.push(...load('data/ai-eval/synthetic.json'));
if (set === 'all' || set === 'real') cases.push(...load('data/ai-eval/real.json').filter((c) => c.expected.every((e) => e.amount > 0) && !c.text.startsWith('(')));

function score(c: Case, got: ParsedItem[]) {
  const left = [...got];
  let matched = 0, catOk = 0;
  for (const e of c.expected) {
    const i = left.findIndex((g) => g.amount === e.amount);
    if (i >= 0) { matched++; if (left[i].category === e.category) catOk++; left.splice(i, 1); }
  }
  return { matched, extra: left.length, missed: c.expected.length - matched, catOk, exact: matched === c.expected.length && left.length === 0 };
}

type Row = { id: string; text: string; tags: string[]; expected: string; got: string; exact: boolean; matched: number; missed: number; extra: number; catOk: number; ms: number; error?: string };
async function run(name: 'rules' | 'gemini'): Promise<Row[]> {
  const rows: Row[] = [];
  for (const [k, c] of cases.entries()) {
    const t0 = performance.now();
    let items: ParsedItem[] = []; let error: string | undefined;
    try {
      const raw = name === 'rules' ? parseByRules(c.text) : await parseWithGemini(c.text, { timeoutMs: 15000 });
      items = validateItems(raw.items, []);
    } catch (e) { error = (e as Error).message; }
    const ms = Math.round(performance.now() - t0);
    rows.push({ id: c.id, text: c.text, tags: c.tags, expected: c.expected.map((e) => e.amount).join('+'), got: items.map((i) => i.amount).join('+'), ms, error, ...score(c, items) });
    if (name === 'gemini') {
      process.stdout.write(`\r${name} ${k + 1}/${cases.length}`);
      if (k + 1 < cases.length) await new Promise((r) => setTimeout(r, delay));
    }
  }
  if (name === 'gemini') process.stdout.write('\n');
  return rows;
}

function summarize(rows: Row[]) {
  const exp = rows.reduce((s, r) => s + r.matched + r.missed, 0);
  const got = rows.reduce((s, r) => s + r.matched + r.extra, 0);
  const matched = rows.reduce((s, r) => s + r.matched, 0);
  const ms = rows.filter((r) => !r.error).map((r) => r.ms).sort((a, b) => a - b);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const byTag: Record<string, { cases: number; exact: number }> = {};
  for (const r of rows) for (const t of r.tags) { byTag[t] ??= { cases: 0, exact: 0 }; byTag[t].cases++; if (r.exact) byTag[t].exact++; }
  return {
    cases: rows.length,
    exact_sentence_pct: pct(rows.filter((r) => r.exact).length, rows.length),
    item_recall_pct: pct(matched, exp),
    item_precision_pct: pct(matched, got),
    category_pct_of_matched: pct(rows.reduce((s, r) => s + r.catOk, 0), matched),
    missed_items: rows.reduce((s, r) => s + r.missed, 0),
    extra_items: rows.reduce((s, r) => s + r.extra, 0),
    errors: rows.filter((r) => r.error).length,
    latency_ms_p50: ms[Math.floor(ms.length * 0.5)] ?? null,
    latency_ms_p95: ms[Math.floor(ms.length * 0.95)] ?? null,
    exact_by_tag: Object.fromEntries(Object.entries(byTag).map(([t, v]) => [t, `${v.exact}/${v.cases}`])),
  };
}

(async () => {
  mkdirSync('sim/out', { recursive: true });
  const report: Record<string, unknown> = { run_at: new Date().toISOString(), set, cases: cases.length, note: 'Synthetic sentences unless set=real' };
  const all: Record<string, Row[]> = { rules: await run('rules') };
  if (!rulesOnly) { all.gemini = await run('gemini'); report.gemini_model = currentModel(); }
  else report.gemini = 'skipped (no GEMINI_API_KEY or --rules-only)';
  for (const [k, rows] of Object.entries(all)) {
    report[k] = summarize(rows);
    const csv = ['id,text,tags,expected,got,exact,missed,extra,ms,error', ...rows.map((r) =>
      [r.id, JSON.stringify(r.text), r.tags.join(' '), r.expected, r.got, r.exact, r.missed, r.extra, r.ms, JSON.stringify(r.error ?? '')].join(','))];
    writeFileSync(`sim/out/ai-eval-${k}.csv`, csv.join('\n') + '\n');
  }
  writeFileSync('sim/out/ai-eval.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const firstErr = all.gemini?.find((r) => r.error)?.error;
  if (firstErr) console.log('\nFirst Gemini error:', firstErr, '\nIf it says the model is not found, set GEMINI_MODEL in .env.local to a model listed in AI Studio.');
})();
