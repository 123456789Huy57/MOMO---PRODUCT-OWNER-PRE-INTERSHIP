'use client';
import { useEffect, useState } from 'react';
import Tabs from '@/components/Tabs';
import { Header, PrototypeTag, Section, Spinner } from '@/components/ui';
import { api, track } from '@/lib/client';
import { daysInMonth, vnd, vndShort, weekday, type CardState } from '@/lib/engine';

interface Month { month: string; today: string; days: { date: string; allowance: number; spent: number; state: CardState }[] }
const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** S3: the allowance of each past day and today (FR08). */
export default function CalendarPage() {
  const [m, setM] = useState<Month | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    api<Month>('/api/allowance/month').then((r) => {
      setM(r);
      const prev = r.days.length > 1 ? r.days[r.days.length - 2].date : r.today;
      setSel(prev);
      const t = r.days.find((d) => d.date === r.today);
      track('allowance_calendar_viewed', { state: t?.state ?? 'notsetup' });
    });
  }, []);
  if (!m) return <main><Header title="Quản lý chi tiêu" back={null} right={<PrototypeTag />} /><Tabs active="calendar" /><Spinner /></main>;

  const first = `${m.month}-01`;
  const lead = (weekday(first) + 6) % 7;
  const total = daysInMonth(m.month);
  const byDate = new Map(m.days.map((d) => [d.date, d]));
  const s = sel ? byDate.get(sel) : undefined;
  const isToday = sel === m.today;
  const note = !s ? '' : isToday ? 'Hôm nay. Số được tiêu tính lúc 0 giờ và trừ dần sau mỗi lần thanh toán.'
    : s.spent > s.allowance ? `Tiêu quá ${vnd(s.spent - s.allowance)}. Phần này đã được chia đều cho các ngày còn lại, nên số của các ngày sau giảm nhẹ.`
    : `Còn dư ${vnd(s.allowance - s.spent)}. Phần dư đã được cộng đều vào các ngày còn lại.`;

  return (
    <main className="flex flex-col pb-24">
      <Header title="Quản lý chi tiêu" back={null} right={<PrototypeTag />} />
      <Tabs active="calendar" />
      <div className="flex flex-col gap-3 p-4">
        {m.days.length === 0 ? (
          <p className="text-body">Bạn chưa thiết lập tiền tiêu hôm nay cho tháng này.</p>
        ) : (
          <>
            <Section label={`Tháng ${Number(m.month.slice(5))}`} className="flex flex-col gap-2.5 px-2.5">
              <div className="flex items-center justify-between px-1.5">
                <h2 className="text-header font-bold">Tháng {Number(m.month.slice(5))}, {m.month.slice(0, 4)}</h2>
                <span className="text-desc text-hint">Số dưới mỗi ngày: tiền được tiêu</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((h) => <span key={h} className="py-1 text-center text-desc font-semibold text-hint">{h}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
                {Array.from({ length: total }, (_, i) => {
                  const date = `${m.month}-${String(i + 1).padStart(2, '0')}`;
                  const d = byDate.get(date);
                  const today = date === m.today;
                  const under = d && !today && d.spent <= d.allowance;
                  return (
                    <button key={date} type="button" disabled={!d} onClick={() => setSel(date)} aria-label={`Ngày ${i + 1}${d && !today ? (under ? ', tiêu trong mức' : ', tiêu quá mức') : ''}`} aria-pressed={sel === date}
                      className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] ${today ? 'bg-brand text-white' : sel === date ? 'border-[1.5px] border-primary bg-selected' : ''} ${!d ? 'text-[#878787]' : ''}`}>
                      <span className="text-header-s font-semibold">{i + 1}</span>
                      <span className="num text-[10px] font-semibold leading-3">{d ? vndShort(d.allowance) : ''}</span>
                      <span aria-hidden="true" className={`h-[5px] w-[5px] ${!d || today ? 'bg-transparent' : under ? 'rounded-full bg-ok' : 'rotate-45 bg-[#8A8A8A]'}`} />
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3.5 px-1.5 text-desc text-hint">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" />Tiêu trong mức</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-[#8A8A8A]" />Tiêu quá mức</span>
              </div>
            </Section>
            {s && sel && (
              <Section label="Ngày đã chọn" className="flex flex-col gap-1.5">
                <h2 className="text-header font-bold">{WD[weekday(sel)]}, {Number(sel.slice(8))}/{Number(sel.slice(5, 7))}</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col"><span className="text-desc text-hint">Được tiêu</span><span className="num text-header font-bold">{vnd(s.allowance)}</span></div>
                  <div className="flex flex-col"><span className="text-desc text-hint">Đã tiêu</span><span className="num text-header font-bold">{vnd(s.spent)}</span></div>
                </div>
                <p className="text-body text-ink2">{note}</p>
              </Section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
