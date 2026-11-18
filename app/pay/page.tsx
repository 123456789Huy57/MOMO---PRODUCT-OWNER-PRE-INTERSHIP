'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorNote, Header, PrimaryButton, SecondaryButton, Section } from '@/components/ui';
import { api } from '@/lib/client';
import { vnd, type CardState } from '@/lib/engine';

const MERCHANTS = ['Cà phê Góc Phố', 'Quán cơm trưa', 'Siêu thị mini', 'Xe công nghệ', 'Trà sữa'];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

interface PayResult {
  id: string; amount: number; merchant: string; at: string;
  line: { remaining: number; allowance: number; state: CardState; tomorrow: number | null } | null;
  timedOut: boolean; timing: { paymentMs: number; engineMs: number };
}

/** S5: simulated payment. The confirm step shows nothing new (decision D6); the line appears only after success (FR09). */
export default function Pay() {
  const [merchant, setMerchant] = useState(MERCHANTS[0]);
  const [amount, setAmount] = useState(45_000);
  const [source, setSource] = useState<'payment' | 'paylater'>('payment');
  const [slow, setSlow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<PayResult | null>(null);

  function press(k: string) {
    const s = String(amount);
    const next = k === 'del' ? s.slice(0, -1) || '0' : (s === '0' ? '' : s) + k;
    setAmount(Math.min(50_000_000, Number(next) || 0));
  }
  async function pay() {
    setBusy(true); setErr('');
    try { setDone(await api<PayResult>('/api/payments', { method: 'POST', json: { merchant, amount, type: source, simulateSlowEngine: slow } })); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (done) {
    const when = new Date(done.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', weekday: 'long', day: '2-digit', month: '2-digit' });
    return (
      <main className="flex min-h-dvh flex-col">
        <section aria-label="Kết quả" className="flex flex-col items-center gap-2.5 bg-white px-6 pb-6 pt-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-okbg">
            <svg width="32" height="32" viewBox="0 0 24 24" role="img" aria-label="Thành công"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#2A9F47" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <h1 className="font-display text-header-m">Thanh toán thành công</h1>
          <span className="num font-display text-[34px] leading-[42px]">{vnd(done.amount)}</span>
          <span className="text-body text-hint">{done.merchant}, {when}</span>
        </section>

        {done.line && (
          <section aria-label="Tiền tiêu hôm nay" className="mx-4 mt-4 flex items-center gap-3 rounded-m bg-tonal p-4">
            <div className="flex flex-1 flex-col">
              {done.line.state === 'usedup' ? (
                <>
                  <span className="text-body text-ink2">Bạn đã dùng hết phần hôm nay</span>
                  {done.line.tomorrow != null && <span className="num font-display text-[20px] leading-7 text-brand">Ngày mai còn khoảng {vnd(done.line.tomorrow)}</span>}
                </>
              ) : done.line.state === 'exhausted' ? (
                <span className="text-body text-ink2">Ngân sách tháng này đã dùng hết</span>
              ) : (
                <>
                  <span className="text-body text-ink2">Hôm nay bạn còn tiêu được</span>
                  <span className="num font-display text-[22px] leading-8 text-brand">{vnd(done.line.remaining)}</span>
                </>
              )}
            </div>
            <Link href="/" className="flex min-h-11 items-center text-header-s font-semibold text-pinkdeep">Xem chi tiết</Link>
          </section>
        )}

        <Section label="Chi tiết giao dịch" className="mx-4 mt-3 py-1">
          <div className="flex justify-between border-b border-line py-3 text-body"><span className="text-hint">Nguồn tiền</span><span>{source === 'paylater' ? 'Ví Trả Sau' : 'Ví'}</span></div>
          <div className="flex justify-between py-3 text-body"><span className="text-hint">Mã giao dịch</span><span className="num">{done.id.slice(-10).toUpperCase()}</span></div>
        </Section>

        <div className="mx-4 mt-3 flex h-28 items-center justify-center rounded-m border border-dashed border-[#C6C6C6] px-6 text-center text-body text-hint">
          Khu vực ưu đãi hiện có của màn hình này, giữ nguyên vị trí
        </div>


        <div className="mt-auto flex gap-2.5 p-4">
          <SecondaryButton href="/">Về trang chủ</SecondaryButton>
          <PrimaryButton onClick={() => { setDone(null); setAmount(45_000); }}>Giao dịch mới</PrimaryButton>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col pb-6">
      <Header title="Thanh toán" back="/" right={<span className="rounded-s bg-white/80 px-2 py-0.5 text-desc font-semibold text-pinkdeep">Giả lập</span>} />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
        <Section label="Cửa hàng" className="flex flex-col gap-2">
          <label htmlFor="merchant" className="text-desc text-hint">Cửa hàng</label>
          <select id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)}
            className="h-12 rounded-s border border-line2 bg-white px-3 text-header-s font-semibold">
            {MERCHANTS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Section>
        <Section label="Số tiền" className="flex flex-col items-center gap-2">
          <span className="text-desc text-hint">Số tiền</span>
          <output aria-live="polite" className="num font-display text-[36px] leading-[44px]">{vnd(amount)}</output>
          <div className="flex gap-2">
            {[45_000, 100_000, 200_000].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(v)} className="h-9 rounded-full border border-line2 px-3 text-header-s font-semibold">{vnd(v)}</button>
            ))}
          </div>
        </Section>
        <Section label="Nguồn tiền" className="flex gap-2">
          {(['payment', 'paylater'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)}
              className={`h-11 flex-1 rounded-s border text-header-s font-semibold ${source === s ? 'border-primary bg-selected text-pinkdeep' : 'border-line2'}`}>
              {s === 'payment' ? 'Ví' : 'Ví Trả Sau'}
            </button>
          ))}
        </Section>
        <div className="mt-auto grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'Xóa' : k}
              className="h-12 rounded-m bg-white text-[20px] font-semibold">{k === 'del' ? '⌫' : k}</button>
          ))}
        </div>
        {err && <ErrorNote message={err} />}
        <PrimaryButton onClick={pay} disabled={busy || amount <= 0}>{busy ? 'Đang thanh toán...' : 'Xác nhận thanh toán'}</PrimaryButton>
        <label className="flex items-center gap-2 text-desc text-hint">
          <input type="checkbox" checked={slow} onChange={() => setSlow(!slow)} className="h-4 w-4 accent-primary" />
          Demo: giả lập engine chậm 600 ms để thử NFR03
        </label>
      </div>
    </main>
  );
}
