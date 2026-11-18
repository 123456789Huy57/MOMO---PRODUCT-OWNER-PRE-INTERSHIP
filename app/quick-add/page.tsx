'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CloseIcon, ErrorNote, PrimaryButton, Sheet } from '@/components/ui';
import { api } from '@/lib/client';
import { vnd } from '@/lib/engine';
import { CATEGORIES, CATEGORY_LABEL, type Category, type ParsedItem, type ParseResult } from '@/lib/ai/types';

interface State { card: { remaining: number; state: string }; recent: { id: string; merchant: string; amount: number; type: string; at: string; counted: boolean }[] }
type Row = ParsedItem & { key: number; edited: boolean };

/**
 * S6: add off-MoMo spending (FR11), mark a transfer as not spending (FR12).
 * Phase 2: type a sentence, AI proposes the items, nothing is saved until the user confirms.
 */
export default function QuickAdd() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [tab, setTab] = useState<'sentence' | 'amount'>('sentence');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<State>('/api/state').then(setS); }, []);

  // Sentence flow
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [removed, setRemoved] = useState(0);
  async function read() {
    setBusy(true); setErr('');
    try {
      const r = await api<ParseResult>('/api/ai/parse', { method: 'POST', json: { text } });
      setResult(r); setRemoved(0);
      setRows(r.items.map((it, i) => ({ ...it, key: i, edited: false })));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  function edit(key: number, patch: Partial<ParsedItem>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, edited: true } : r)));
  }
  function remove(key: number) { setRows((rs) => rs.filter((r) => r.key !== key)); setRemoved((n) => n + 1); }
  async function confirm() {
    setBusy(true); setErr('');
    try {
      await api('/api/transactions/quick-add', {
        method: 'POST',
        json: {
          flow: 'sentence', source: result?.source, proposed: result?.items.length, removed,
          edited: rows.filter((r) => r.edited).length,
          items: rows.map(({ label, amount, category, method }) => ({ label, amount, category, method })),
        },
      });
      router.push('/');
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  // Amount flow (unchanged from phase 1)
  const [amount, setAmount] = useState(30_000);
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  async function addAmount() {
    setBusy(true); setErr('');
    try { await api('/api/transactions/quick-add', { method: 'POST', json: { amount, method } }); router.push('/'); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  const transfers = s?.recent.filter((t) => t.type === 'transfer_out') ?? [];
  async function mark(id: string, counted: boolean) {
    await api(`/api/transactions/${id}`, { method: 'PATCH', json: { notSpending: counted } });
    setS(await api<State>('/api/state'));
  }
  const pending = tab === 'sentence' ? rows.reduce((t, r) => t + r.amount, 0) : amount;

  return (
    <Sheet label="Thêm khoản tiêu ngoài MoMo" onClose={() => router.push('/')}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-header-m">Thêm khoản tiêu ngoài MoMo</h1>
        <button type="button" aria-label="Đóng" onClick={() => router.push('/')} className="flex h-11 w-11 items-center justify-center"><CloseIcon /></button>
      </div>

      <div role="tablist" className="flex rounded-m bg-page p-1">
        {([['sentence', 'Gõ nhanh'], ['amount', 'Nhập số tiền']] as const).map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { setTab(k); setErr(''); }}
            className={`h-9 flex-1 rounded-s text-header-s font-semibold ${tab === k ? 'bg-white text-pinkdeep shadow-light' : 'text-hint'}`}>{l}</button>
        ))}
      </div>

      {tab === 'sentence' ? (
        <>
          <label className="flex flex-col gap-2 text-desc text-hint">Gõ như ghi chú, nhiều khoản cùng lúc
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500}
              placeholder="phở 50, gửi xe 5k, chợ 120 nghìn"
              className="resize-none rounded-m border border-line2 p-3 text-body text-ink focus:border-primary focus:outline-none" />
          </label>
          {!result && (
            <button type="button" onClick={read} disabled={busy || !text.trim()}
              className="h-12 rounded-m border border-primary font-semibold text-pinkdeep disabled:opacity-40">
              {busy ? 'Đang đọc...' : 'Đọc giúp tôi'}
            </button>
          )}
          {result && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-header-s font-semibold">Kiểm tra trước khi thêm</span>
                <span className={`rounded-full px-2 py-0.5 text-desc-xs font-semibold ${result.source === 'gemini' ? 'bg-tonal text-pinkdeep' : 'bg-page text-hint'}`}>
                  {result.source === 'gemini' ? 'AI đề xuất' : 'Đọc nhanh, hãy kiểm tra kỹ'}
                </span>
              </div>
              {rows.length === 0 && <p className="text-body text-hint">Không tìm thấy khoản chi nào. Hãy ghi kèm số tiền, ví dụ "phở 50".</p>}
              {rows.map((r) => (
                <div key={r.key} className="flex flex-col gap-1 rounded-m border border-line p-3">
                  <div className="flex items-center gap-2">
                    <input aria-label="Tên khoản chi" value={r.label} onChange={(e) => edit(r.key, { label: e.target.value })}
                      className="min-w-0 flex-1 border-b border-dashed border-line2 bg-transparent text-header-s font-semibold focus:border-primary focus:outline-none" />
                    <input aria-label="Số tiền" inputMode="numeric" value={vnd(r.amount)}
                      onChange={(e) => edit(r.key, { amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                      className="num w-28 border-b border-dashed border-line2 bg-transparent text-right text-header-s font-semibold focus:border-primary focus:outline-none" />
                    <button type="button" aria-label={`Bỏ ${r.label}`} onClick={() => remove(r.key)} className="flex h-8 w-8 items-center justify-center text-hint"><CloseIcon size={14} /></button>
                  </div>
                  <div className="flex gap-2 text-desc text-hint">
                    <select aria-label="Nhóm" value={r.category} onChange={(e) => edit(r.key, { category: e.target.value as Category })} className="bg-transparent">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                    <span aria-hidden="true">·</span>
                    <select aria-label="Trả bằng" value={r.method} onChange={(e) => edit(r.key, { method: e.target.value as 'cash' | 'bank' })} className="bg-transparent">
                      <option value="cash">Tiền mặt</option><option value="bank">Ngân hàng</option>
                    </select>
                  </div>
                </div>
              ))}
              {result.warnings.map((w) => <p key={w} className="text-desc text-pinkdeep">{w}</p>)}
              <button type="button" onClick={() => { setResult(null); setRows([]); }} className="self-start text-desc font-semibold text-pinkdeep underline">Gõ lại</button>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-desc text-hint">Số tiền
            <input inputMode="numeric" value={vnd(amount)} onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
              className="num border-b border-primary bg-transparent py-1 font-display text-headline-l text-ink focus:outline-none" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[20_000, 30_000, 50_000, 100_000].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(v)} className="h-9 rounded-full border border-line2 px-3 text-header-s font-semibold">{vnd(v)}</button>
            ))}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 text-desc text-hint">Trả bằng</legend>
            <div className="flex gap-2">
              {(['cash', 'bank'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)}
                  className={`h-11 flex-1 rounded-s border text-header-s font-semibold ${method === m ? 'border-primary bg-selected text-pinkdeep' : 'border-line2'}`}>
                  {m === 'cash' ? 'Tiền mặt' : 'Ngân hàng'}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {s && s.card.state !== 'notsetup' && pending > 0 && (
        s.card.remaining - pending >= 0
          ? <p className="num text-body text-ink2">Sau khi thêm, hôm nay bạn còn tiêu được <strong>{vnd(s.card.remaining - pending)}</strong></p>
          : <p className="num text-body text-ink2">Sau khi thêm, bạn tiêu quá phần hôm nay <strong>{vnd(pending - Math.max(0, s.card.remaining))}</strong>. Phần này sẽ được chia đều cho các ngày còn lại.</p>
      )}
      {err && <ErrorNote message={err} />}
      {tab === 'amount' && <PrimaryButton onClick={addAmount} disabled={busy || amount <= 0}>{busy ? 'Đang thêm...' : 'Thêm khoản tiêu'}</PrimaryButton>}
      {tab === 'sentence' && result && rows.length > 0 && (
        <PrimaryButton onClick={confirm} disabled={busy || rows.some((r) => r.amount <= 0)}>
          {busy ? 'Đang thêm...' : `Thêm ${rows.length} khoản, ${vnd(pending)}`}
        </PrimaryButton>
      )}

      {transfers.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <span className="text-header-s font-semibold">Khoản chuyển này có phải chi tiêu không?</span>
          {transfers.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="flex flex-1 flex-col">
                <span className="text-header-s font-semibold">{t.merchant}</span>
                <span className="num text-desc text-hint">{vnd(t.amount)}</span>
              </span>
              <button type="button" aria-pressed={!t.counted} onClick={() => mark(t.id, t.counted)}
                className={`h-9 rounded-s border border-primary px-3 text-header-s font-semibold ${t.counted ? 'bg-white text-pinkdeep' : 'bg-primary text-white'}`}>
                {t.counted ? 'Không phải chi tiêu' : 'Đã bỏ khỏi chi tiêu'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
