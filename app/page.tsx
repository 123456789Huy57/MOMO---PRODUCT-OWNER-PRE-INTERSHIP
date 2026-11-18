'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AllowanceCard, { type CardData } from '@/components/AllowanceCard';
import { CloseIcon, ErrorNote, Header, PrototypeTag, Section, Spinner } from '@/components/ui';
import { api, track } from '@/lib/client';
import Tabs from '@/components/Tabs';
import { vnd, vndShort } from '@/lib/engine';

interface State {
  user: { id: string; name: string };
  now: string;
  todayDate: string;
  card: CardData;
  eligible: boolean;
  month: { budget: number; goal: number; spent: number } | null;
  upcoming: { name: string; dueDay: number; amount: number }[];
  week: { date: string; day: number; label: string; allowance: number | null; today: boolean }[];
  recent: { id: string; merchant: string; amount: number; type: string; at: string; counted: boolean }[];
  goodNews: number | null;
  sundayPrompt: boolean;
}

function timeVN(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export default function Overview() {
  const [s, setS] = useState<State | null>(null);
  const [err, setErr] = useState('');
  const [hideNews, setHideNews] = useState(false);
  useEffect(() => { api<State>('/api/state').then(setS).catch((e) => setErr(e.message)); }, []);

  return (
    <main className="flex flex-col pb-24">
      <Header title="Quản lý chi tiêu" back={null} right={<PrototypeTag />} />
      <Tabs active="overview" />
      <div className="flex flex-col gap-3.5 p-4">
        {err && <ErrorNote message={err} />}
        {!s && !err && <Spinner />}
        {s && (
          <>
            {s.goodNews && !hideNews && (
              <section role="status" aria-label="Tin tốt" className="flex gap-3 rounded-m bg-white p-3.5 shadow-light">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-m bg-okbg">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M7 13l5-5 5 5" fill="none" stroke="#2A9F47" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 4h14" stroke="#2A9F47" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="num text-header font-bold">Hôm qua bạn để dành được {vnd(s.goodNews)}</span>
                  <span className="text-body text-ink2">Phần này đã được cộng đều vào các ngày còn lại.</span>
                  <Link href="/settings" className="mt-1 self-start text-desc font-semibold text-hint underline underline-offset-4">Tắt loại thông báo này</Link>
                </div>
                <button type="button" aria-label="Đóng thông báo" className="flex h-9 w-9 items-center justify-center text-hint"
                  onClick={() => { setHideNews(true); track('allowance_goodnews_opened', { amount_saved: s.goodNews }); }}>
                  <CloseIcon size={16} />
                </button>
              </section>
            )}

            {s.sundayPrompt && (
              <Link href="/sunday" className="flex items-center justify-between rounded-m bg-white p-3.5 shadow-light">
                <span className="flex flex-col">
                  <span className="text-header-s font-semibold">Ước lượng chi ngoài MoMo tuần này</span>
                  <span className="text-desc text-hint">Một câu hỏi, chỉ cần ước lượng</span>
                </span>
                <span className="rounded-s bg-primary px-3 py-2 text-header-s font-bold text-white">Trả lời</span>
              </Link>
            )}

            {!s.eligible && s.card.state === 'notsetup' ? (
              <Section label="Chưa đủ điều kiện">
                <p className="text-body">Tính năng đang mở cho người dùng có từ 15 giao dịch MoMo trong 30 ngày gần nhất.</p>
              </Section>
            ) : (
              <AllowanceCard data={s.card} />
            )}

            {s.month && (
              <Section label="Tuần này" className="px-3">
                <div className="mb-2.5 flex items-baseline justify-between px-1">
                  <h2 className="text-header font-bold">Tuần này</h2>
                  <Link href="/calendar" className="text-header-s font-semibold text-pinkdeep">Xem lịch tháng</Link>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {s.week.map((d) => (
                    <div key={d.date} className={`flex flex-col items-center gap-1 rounded-m py-2 ${d.today ? 'bg-brand text-white' : d.allowance != null ? 'bg-page' : 'text-[#878787]'}`}>
                      <span className="text-desc-xs font-medium">{d.label}</span>
                      <span className="text-header font-bold">{d.day}</span>
                      <span className="num text-desc-xs font-semibold">{d.allowance != null ? vndShort(d.allowance) : '·'}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {s.month && (
              <Section label={`Tháng ${Number(s.todayDate.slice(5, 7))}`} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-header font-bold">Tháng {Number(s.todayDate.slice(5, 7))}</h2>
                  <Link href="/settings" className="text-header-s font-semibold text-pinkdeep">Cài đặt</Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <span className="text-desc text-hint">Đã chi</span>
                    <span className="num text-header font-bold">{vnd(s.month.spent)}</span>
                    <span className="num text-desc text-hint">trên ngân sách {vnd(s.month.budget)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-desc text-hint">Để dành</span>
                    <span className="num text-header font-bold">{vnd(s.month.goal)}</span>
                    <span className="text-desc text-hint">giữ riêng từ đầu tháng</span>
                  </div>
                </div>
                {s.upcoming.map((b) => (
                  <div key={b.name} className="flex items-center gap-2.5 rounded-s bg-page px-3 py-2.5">
                    <span className="flex-1 text-body">{b.name}, ngày {b.dueDay}</span>
                    <span className="num text-body font-semibold">{vnd(b.amount)} đã giữ sẵn</span>
                  </div>
                ))}
              </Section>
            )}

            <Section label="Giao dịch gần đây" className="py-1.5">
              <h2 className="py-2 text-header font-bold">Giao dịch gần đây</h2>
              {s.recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 border-t border-line py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-m bg-tonal text-header-s font-bold text-pinkdeep">{t.merchant.slice(0, 1)}</span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-header-s font-semibold">{t.merchant}</span>
                    <span className="text-desc text-hint">{timeVN(t.at)}{t.counted ? '' : ', không tính là chi tiêu'}</span>
                  </div>
                  <span className="num text-header-s font-semibold">{t.type === 'topup' || t.type === 'refund' ? '+' : '−'}{vnd(t.amount)}</span>
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
