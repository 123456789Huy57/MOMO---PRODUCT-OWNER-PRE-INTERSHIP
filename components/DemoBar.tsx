'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/client';

const PERSONAS = [
  { id: 'trang', name: 'Trang', note: 'Đã thiết lập, dùng ví dụ của Part 2' },
  { id: 'khoa', name: 'Khoa', note: 'Chưa thiết lập, thử luồng thiết lập' },
  { id: 'hanh', name: 'Hạnh', note: 'Chi nhiều tiền mặt, có ước lượng tuần' },
];

/** Demo tools for presenting the prototype; not part of the product. */
export default function DemoBar() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ user: { id: string; name: string }; now: string } | null>(null);

  async function load() {
    setOpen(true);
    setInfo(await api('/api/state'));
  }
  async function act(json: Record<string, unknown>, goto = '/') {
    setBusy(true);
    try { await api('/api/demo/clock', { method: 'POST', json }); window.location.assign(goto); } finally { setBusy(false); }
  }
  const when = info ? new Date(info.now).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <>
      <button type="button" onClick={load} aria-label="Mở công cụ demo"
        className="fixed right-0 top-[58%] z-30 flex h-10 w-9 items-center justify-center rounded-l-m bg-ink/85 text-desc font-semibold text-white shadow-light md:right-[calc(50%-215px)]">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col justify-end">
          <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <section role="dialog" aria-label="Công cụ demo" className="relative flex flex-col gap-4 rounded-t-l bg-white px-4 pb-6 pt-4">
            <div>
              <h2 className="text-header font-bold">Công cụ demo</h2>
              <p className="text-desc text-hint">Chỉ dùng khi trình bày. Dữ liệu là giả lập.</p>
              {info && <p className="mt-1 text-body">Đang xem: <strong>{info.user.name}</strong>, {when}</p>}
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-header-s font-semibold">Người dùng thử</legend>
              {PERSONAS.map((p) => (
                <button key={p.id} type="button" disabled={busy} onClick={() => act({ action: 'persona', persona: p.id })}
                  className={`flex min-h-12 flex-col items-start justify-center rounded-s border px-3 text-left ${info?.user.id === p.id ? 'border-primary bg-selected' : 'border-line'}`}>
                  <span className="text-header-s font-semibold">{p.name}</span>
                  <span className="text-desc text-hint">{p.note}</span>
                </button>
              ))}
            </fieldset>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => act({ action: 'next-day' })} className="h-12 rounded-s border border-line text-header-s font-semibold">Sang ngày mai</button>
              <button type="button" disabled={busy} onClick={() => act({ action: 'sunday-evening' })} className="h-12 rounded-s border border-line text-header-s font-semibold">Tới 19:00 Chủ nhật</button>
              <Link href="/pay" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center rounded-s border border-line text-header-s font-semibold">Thanh toán thử</Link>
              <Link href="/admin/funnel" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center rounded-s border border-line text-header-s font-semibold">Xem event</Link>
            </div>
            <button type="button" disabled={busy} onClick={() => act({ action: 'reset' })} className="h-12 rounded-s text-header-s font-semibold text-hint underline underline-offset-4">Đặt lại toàn bộ dữ liệu demo</button>
          </section>
        </div>
      )}
    </>
  );
}
