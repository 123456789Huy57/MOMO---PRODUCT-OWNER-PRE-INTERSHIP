import type { Db } from './db/client';

// Three test personas with SYNTHETIC data (fixed seed, so every run is identical).
// They are designed to exercise groups of business rules, not to describe real users.

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TxRow = { id: string; user: string; amount: number; type: string; source: string; merchant: string; category: string; bill: string | null; at: string };

const at = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
const pad = (n: number) => String(n).padStart(2, '0');
const days = (month: string) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
const round1000 = (v: number) => Math.round(v / 1000) * 1000;

const MERCHANTS: [string, string][] = [
  ['Cà phê Góc Phố', 'Ăn uống'], ['Quán cơm trưa', 'Ăn uống'], ['Xe công nghệ', 'Đi lại'], ['Siêu thị mini', 'Mua sắm'],
  ['Bánh mì đầu hẻm', 'Ăn uống'], ['Trà sữa', 'Ăn uống'], ['Nhà sách', 'Mua sắm'], ['Cửa hàng tiện lợi', 'Mua sắm'],
];

export const DEMO_TODAY = '2026-11-11';

export async function seed(db: Db) {
  for (const t of ['events', 'weekly_estimates', 'daily_allowances', 'transactions', 'planned_bills', 'recurring_bills', 'allowance_plans', 'users']) {
    await db.query(`DELETE FROM ${t}`);
  }
  const tx: TxRow[] = [];
  let k = 0;
  const add = (user: string, date: string, time: string, amount: number, type = 'payment', merchant = '', category = '', bill: string | null = null) =>
    tx.push({ id: `${user}-${++k}`, user, amount, type, source: type === 'manual' ? 'manual' : 'momo', merchant, category, bill, at: at(date, time) });

  const demoNow = at(DEMO_TODAY, '08:00');
  await db.query(`INSERT INTO users (id, display_name, persona_note, consent_at, demo_now) VALUES
    ('trang','Trang','Nhân viên văn phòng, lương cố định. Đã thiết lập; dùng ví dụ của Part 2.', $1, $2),
    ('khoa','Khoa','Sinh viên, nhiều giao dịch nhỏ. Chưa thiết lập.', NULL, $2),
    ('hanh','Hạnh','Phụ huynh, chi nhiều tiền mặt. Đã thiết lập, có ước lượng tuần.', $1, $2)`, [at('2026-11-01', '09:00'), demoNow]);

  // ---------- Trang ----------
  await db.query(`INSERT INTO recurring_bills VALUES ('rent','trang','Tiền nhà',5,3000000),('power','trang','Điện',20,400000),('net','trang','Internet',20,200000)`);
  const r1 = rng(11);
  for (const month of ['2026-08', '2026-09', '2026-10']) {
    for (let d = 1; d <= days(month); d++) {
      const date = `${month}-${pad(d)}`;
      const n = 1 + Math.floor(r1() * 3);
      for (let i = 0; i < n; i++) {
        const [m, c] = MERCHANTS[Math.floor(r1() * MERCHANTS.length)];
        add('trang', date, `${pad(8 + i * 4)}:${pad(Math.floor(r1() * 59))}`, round1000(34_000 + r1() * 90_000), r1() < 0.12 ? 'manual' : 'payment', m, c);
      }
    }
    add('trang', `${month}-05`, '20:00', 3_000_000, 'manual', 'Chủ nhà', 'Nhà ở', 'rent');
    add('trang', `${month}-20`, '19:00', 400_000, 'payment', 'Điện lực', 'Hóa đơn', 'power');
    add('trang', `${month}-20`, '19:05', 200_000, 'payment', 'Nhà mạng', 'Hóa đơn', 'net');
  }
  // November days 1-10: exactly the worked example of Part 2 (1,600,000đ day-to-day + rent).
  const nov: [number, [string, number][]][] = [
    [1, [['Cà phê Góc Phố', 45_000], ['Quán cơm trưa', 75_000]]], [2, [['Bánh mì đầu hẻm', 25_000], ['Xe công nghệ', 70_000]]],
    [3, [['Siêu thị mini', 140_000], ['Trà sữa', 60_000]]], [4, [['Quán cơm trưa', 60_000], ['Xe công nghệ', 80_000]]],
    [5, [['Nhà sách', 120_000], ['Cà phê Góc Phố', 60_000]]], [6, [['Quán cơm trưa', 55_000], ['Cửa hàng tiện lợi', 80_000]]],
    [7, [['Siêu thị mini', 190_000], ['Trà sữa', 70_000]]], [8, [['Quán cơm trưa', 65_000], ['Xe công nghệ', 85_000]]],
    [9, [['Cà phê Góc Phố', 45_000], ['Siêu thị mini', 130_000]]], [10, [['Quán cơm trưa', 55_000], ['Xe công nghệ', 40_000], ['Siêu thị mini', 50_000]]],
  ];
  for (const [d, items] of nov) {
    items.forEach(([m, v], i) => add('trang', `2026-11-${pad(d)}`, `${pad(9 + i * 5)}:1${i}`, v, 'payment', m, MERCHANTS.find((x) => x[0] === m)?.[1] ?? ''));
  }
  add('trang', '2026-11-05', '20:00', 3_000_000, 'manual', 'Chủ nhà', 'Nhà ở', 'rent');
  const [{ id: trangPlan }] = await db.query<{ id: number }>(`INSERT INTO allowance_plans (user_id, month, budget_b, goal_g) VALUES ('trang','2026-11',8000000,1000000) RETURNING id`);
  await db.query(`INSERT INTO planned_bills VALUES ($1,'rent',3000000,true),($1,'power',400000,true),($1,'net',200000,true)`, [trangPlan]);

  // ---------- Khoa ----------
  await db.query(`INSERT INTO recurring_bills VALUES ('phone','khoa','Cước điện thoại',15,100000)`);
  const r2 = rng(22);
  for (const month of ['2026-08', '2026-09', '2026-10', '2026-11']) {
    const last = month === '2026-11' ? 10 : days(month);
    add('khoa', `${month}-01`, '10:00', 2_000_000, 'topup', 'Nạp từ ngân hàng', '');
    add('khoa', `${month}-15`, '10:00', 1_000_000, 'topup', 'Nạp từ ngân hàng', '');
    if (month !== '2026-11') add('khoa', `${month}-15`, '11:00', 100_000, 'payment', 'Nhà mạng', 'Hóa đơn', 'phone');
    for (let d = 1; d <= last; d++) {
      const n = 2 + Math.floor(r2() * 4);
      for (let i = 0; i < n; i++) {
        const [m, c] = MERCHANTS[Math.floor(r2() * MERCHANTS.length)];
        add('khoa', `${month}-${pad(d)}`, `${pad(7 + i * 3)}:${pad(Math.floor(r2() * 59))}`, round1000(12_000 + r2() * 38_000), 'payment', m, c);
      }
    }
  }

  // ---------- Hạnh ----------
  await db.query(`INSERT INTO recurring_bills VALUES ('school','hanh','Học phí',10,2500000),('power2','hanh','Điện',22,700000)`);
  const r3 = rng(33);
  for (const month of ['2026-08', '2026-09', '2026-10', '2026-11']) {
    const last = month === '2026-11' ? 10 : days(month);
    for (let d = 1; d <= last; d++) {
      add('hanh', `${month}-${pad(d)}`, '07:30', round1000(120_000 + r3() * 160_000), 'manual', 'Chợ', 'Ăn uống');
      if (r3() < 0.6) {
        const [m, c] = MERCHANTS[Math.floor(r3() * MERCHANTS.length)];
        add('hanh', `${month}-${pad(d)}`, '17:20', round1000(30_000 + r3() * 150_000), 'payment', m, c);
      }
    }
    add('hanh', `${month}-10`, '09:00', 2_500_000, 'payment', 'Trường học', 'Giáo dục', 'school');
    if (month !== '2026-11') add('hanh', `${month}-22`, '09:00', 700_000, 'payment', 'Điện lực', 'Hóa đơn', 'power2');
  }
  add('hanh', '2026-11-10', '20:30', 500_000, 'transfer_out', 'Chuyển cho chị Lan', 'Chuyển tiền');
  const [{ id: hanhPlan }] = await db.query<{ id: number }>(`INSERT INTO allowance_plans (user_id, month, budget_b, goal_g) VALUES ('hanh','2026-11',12000000,2000000) RETURNING id`);
  await db.query(`INSERT INTO planned_bills VALUES ($1,'school',2500000,true),($1,'power2',700000,true)`, [hanhPlan]);
  await db.query(`INSERT INTO weekly_estimates (user_id, answered_on, range, reserve_e) VALUES ('hanh','2026-11-08','500to1000',107142)`);

  // Bulk insert in chunks.
  for (let i = 0; i < tx.length; i += 200) {
    const chunk = tx.slice(i, i + 200);
    const vals: unknown[] = [];
    const rows = chunk.map((t, j) => {
      vals.push(t.id, t.user, t.amount, t.type, t.source, t.merchant, t.category, t.bill, t.at);
      const b = j * 9;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`;
    });
    await db.query(`INSERT INTO transactions (id,user_id,amount,type,source,merchant,category,bill_id,occurred_at) VALUES ${rows.join(',')}`, vals);
  }
  return { transactions: tx.length };
}
