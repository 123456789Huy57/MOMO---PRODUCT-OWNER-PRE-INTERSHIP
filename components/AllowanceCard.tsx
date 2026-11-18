'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { vnd, type CardState } from '@/lib/engine';
import { track } from '@/lib/client';
import { PlusIcon } from './ui';

// Banknote guilloche lines, after MoMo's 2024 identity built on paper money.
function waves() {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const amp = 9 + i * 0.6, off = -10 + i * 19, ph = i * 0.55;
    let d = '';
    for (let x = -10; x <= 440; x += 6) {
      const y = off + amp * Math.sin(x / 38 + ph) + 5 * Math.sin(x / 13 + ph * 1.7);
      d += (x === -10 ? 'M' : ' L') + x + ',' + y.toFixed(1);
    }
    out.push(d);
  }
  return out;
}
const WAVES = waves();

const THEME: Record<CardState, { box: string; line: string; chip: string; track: string; bar: string; btn: string }> = {
  normal: { box: 'text-white', line: 'rgba(255,255,255,0.14)', chip: 'bg-white/20', track: 'bg-white/30', bar: 'bg-white', btn: 'bg-white text-brand' },
  low: { box: 'bg-tonal text-ink border border-[#FBD5EA]', line: 'rgba(235,47,150,0.12)', chip: 'bg-white', track: 'bg-ink/10', bar: 'bg-[#727272]', btn: 'bg-primary text-white' },
  usedup: { box: 'bg-white text-ink border border-line', line: 'rgba(48,50,51,0.06)', chip: 'bg-page', track: 'bg-ink/10', bar: 'bg-[#727272]', btn: 'bg-primary text-white' },
  exhausted: { box: 'bg-white text-ink border border-line', line: 'rgba(48,50,51,0.06)', chip: 'bg-page', track: 'bg-ink/10', bar: 'bg-[#727272]', btn: 'bg-primary text-white' },
  notsetup: { box: 'bg-white text-ink border border-pinkline', line: 'rgba(235,47,150,0.08)', chip: 'bg-tonal', track: 'bg-ink/10', bar: 'bg-primary', btn: 'bg-primary text-white' },
};

export interface CardData {
  state: CardState; allowance: number; remaining: number; spentToday: number; D: number; date: string; tomorrow?: number | null;
}

export default function AllowanceCard({ data, trackView = true }: { data: CardData; trackView?: boolean }) {
  const t = THEME[data.state];
  const day = Number(data.date.slice(8, 10));
  const usedPct = data.allowance > 0 ? Math.min(100, Math.max(0, Math.round(((data.allowance - data.remaining) / data.allowance) * 100))) : 0;
  useEffect(() => {
    if (trackView && data.state !== 'notsetup') {
      const id = setTimeout(() => track('allowance_card_viewed', { state: data.state, amount: data.remaining, days_left: data.D }), 1000);
      return () => clearTimeout(id);
    }
  }, [trackView, data.state, data.remaining, data.D]);

  return (
    <div className={`relative overflow-hidden rounded-l px-4 pb-3 pt-4 shadow-light ${t.box}`}
      style={data.state === 'normal' ? { background: 'linear-gradient(135deg, #A50064 0%, #BC2678 100%)' } : undefined}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 430 220" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
        {WAVES.map((d, i) => <path key={i} d={d} fill="none" stroke={t.line} strokeWidth="1" />)}
      </svg>
      <div className="relative flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-header-s font-semibold">Tiền tiêu hôm nay</span>
          <span className={`rounded-s px-2 py-0.5 text-desc font-medium ${t.chip}`}>Ngày {day}, còn {data.D} ngày</span>
        </div>

        {(data.state === 'normal' || data.state === 'low') && (
          <>
            <div className="flex flex-col">
              <span className="text-body font-medium">Hôm nay bạn còn tiêu được</span>
              <span className="num font-display text-[40px] leading-[48px]" aria-live="polite">{vnd(Math.max(0, data.remaining))}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className={`h-1.5 overflow-hidden rounded-full ${t.track}`}>
                <div className={`h-1.5 rounded-full ${t.bar}`} style={{ width: `${usedPct}%` }} />
              </div>
              <span className="num text-desc">
                {data.spentToday > 0 ? `Đã tiêu ${vnd(data.spentToday)} trên ${vnd(data.allowance)} của hôm nay` : 'Chưa tiêu khoản nào hôm nay. Phần dư sẽ cộng vào các ngày sau.'}
              </span>
            </div>
          </>
        )}

        {data.state === 'usedup' && (
          <div className="flex flex-col gap-1">
            <span className="font-display text-[20px] leading-7">Bạn đã dùng hết phần hôm nay</span>
            <span className="num text-body">
              {data.tomorrow != null ? <>Ngày mai còn khoảng <strong>{vnd(data.tomorrow)}</strong>. </> : null}
              Phần tiêu thêm đã được chia đều cho các ngày còn lại.
            </span>
          </div>
        )}

        {data.state === 'exhausted' && (
          <div className="flex flex-col gap-2.5">
            <span className="font-display text-[20px] leading-7">Ngân sách tháng này đã dùng hết</span>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings" className="flex h-9 items-center rounded-s bg-primary px-3 text-header-s font-bold text-white">Điều chỉnh ngân sách</Link>
              <Link href="/settings" className="flex h-9 items-center rounded-s border border-primary px-3 text-header-s font-bold text-pinkdeep">Giảm mục tiêu để dành</Link>
            </div>
          </div>
        )}

        {data.state === 'notsetup' && (
          <div className="flex flex-col gap-2.5">
            <span className="font-display text-[20px] leading-7">Xem mỗi ngày bạn còn tiêu được bao nhiêu</span>
            <span className="text-body">Đặt ngân sách và mục tiêu để dành một lần, MoMo tính phần còn lại mỗi sáng.</span>
            <Link href="/setup" className="flex h-12 items-center justify-center self-start rounded-s bg-primary px-5 text-header font-bold text-white">Bắt đầu thiết lập</Link>
          </div>
        )}

        {(data.state === 'normal' || data.state === 'low' || data.state === 'usedup') && (
          <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: t.line }}>
            <Link href="/explain" className="flex min-h-9 items-center text-header-s font-semibold underline underline-offset-4">Vì sao là con số này?</Link>
            <Link href="/quick-add" className={`flex min-h-9 items-center gap-1.5 rounded-s px-3 text-header-s font-semibold ${t.btn}`}>
              <PlusIcon />Tiêu ngoài MoMo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
