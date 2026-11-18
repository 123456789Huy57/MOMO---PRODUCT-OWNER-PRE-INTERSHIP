import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';

// NFR01 / NFR02 measurement against a running server (default http://localhost:3000).
//   npm run latency -- http://localhost:3000     (or the Vercel URL)
// Resets the demo data before and after. Numbers are only valid for the machine and database measured.
const base = process.argv[2] ?? 'http://localhost:3000';
const N_CARD = 300, N_PAY = 200;
const H = { 'content-type': 'application/json', cookie: 'uid=trang' };
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const sum = (a: number[]) => ({ n: a.length, p50: Math.round(pct(a, 0.5)), p95: Math.round(pct(a, 0.95)), max: Math.round(Math.max(...a)) });
const reset = () => fetch(`${base}/api/demo/clock`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'reset' }) });

(async () => {
  await reset();
  for (let i = 0; i < 10; i++) await fetch(`${base}/api/allowance/today`, { headers: H }); // warm-up
  const card: number[] = [];
  for (let i = 0; i < N_CARD; i++) {
    const t0 = performance.now();
    const r = await fetch(`${base}/api/allowance/today`, { headers: H }); await r.json();
    card.push(performance.now() - t0);
  }
  const client: number[] = [], payment: number[] = [], engine: number[] = [];
  let timedOut = 0;
  for (let i = 0; i < N_PAY; i++) {
    const t0 = performance.now();
    const r = await fetch(`${base}/api/payments`, { method: 'POST', headers: H, body: JSON.stringify({ merchant: 'Cà phê Góc Phố', amount: 1000, type: 'wallet' }) });
    const j = await r.json();
    client.push(performance.now() - t0); payment.push(j.timing.paymentMs); engine.push(j.timing.engineMs);
    if (j.timedOut) timedOut++;
  }
  await reset();
  const out = {
    base, run_at: new Date().toISOString(), node: process.version, cpu: os.cpus()[0]?.model, cores: os.cpus().length,
    database: process.env.DATABASE_URL ? 'Neon (DATABASE_URL)' : 'PGlite local (see server env)',
    nfr01_card_api_ms: sum(card),
    nfr02_payment_total_ms: sum(client), nfr02_payment_write_ms: sum(payment), nfr02_engine_added_ms: sum(engine), engine_timeouts: timedOut,
  };
  mkdirSync('sim/out', { recursive: true });
  writeFileSync('sim/out/latency.json', JSON.stringify(out, null, 2));
  console.log(out);
})();
