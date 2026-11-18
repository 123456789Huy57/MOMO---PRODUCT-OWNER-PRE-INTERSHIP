'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorNote, Header, PrimaryButton, Section, Spinner } from '@/components/ui';
import { api } from '@/lib/client';
import { allowanceFormula, vnd } from '@/lib/engine';

interface State { card: { S: number; R: number; D: number; E: number; state: string }; month: { budget: number; goal: number } | null }

const STEP = 500_000;

/** S9: change budget or goal at any time; recomputed at once (FR15, BR10, BR13), plus notification switches. */
export default function Settings() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [budget, setBudget] = useState(0);
  const [goal, setGoal] = useState(0);
  const [goodnews, setGoodnews] = useState(true);
  const [sunday, setSunday] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<State>('/api/state').then((r) => { setS(r); if (r.month) { setBudget(r.month.budget); setGoal(r.month.goal); } });
  }, []);
  if (!s) return <main><Header title="Cài đặt tiền tiêu hôm nay" back="/" /><Spinner /></main>;
  if (!s.month) return <main><Header title="Cài đặt tiền tiêu hôm nay" back="/" /><p className="p-4 text-body">Bạn chưa thiết lập tháng này.</p></main>;

  const preview = allowanceFormula(budget, goal, s.card.S, s.card.R, s.card.D, s.card.E);
  async function save(extra: Record<string, unknown> = {}) {
    try { await api('/api/plan', { method: 'PATCH', json: { budget, goal, goodnewsOptOut: !goodnews, sundayOptOut: !sunday, ...extra } }); router.push('/'); }
    catch (e) { setErr((e as Error).message); }
  }
  const rows = [
    { label: 'Ngân sách tháng', value: budget, set: setBudget, hint: 'Gõ số hoặc bấm để thay đổi 500.000đ', dec: () => setBudget(Math.max(goal * 2, budget - STEP)), inc: () => setBudget(budget + STEP) },
    { label: 'Để dành trước', value: goal, set: setGoal, hint: `Tối đa một nửa ngân sách: ${vnd(budget / 2)}`, dec: () => setGoal(Math.max(0, goal - STEP)), inc: () => setGoal(Math.min(budget / 2, goal + STEP)) },
  ];

  return (
    <main className="flex min-h-dvh flex-col pb-24">
      <Header title="Cài đặt tiền tiêu hôm nay" back="/" />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
        <Section label="Ngân sách và để dành" className="py-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5 border-b border-line py-3">
              <span className="flex flex-1 flex-col">
                <span className="text-desc text-hint">{r.label}</span>
                <input aria-label={r.label} inputMode="numeric" value={vnd(r.value)} onChange={(e) => r.set(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  className="num w-full border-b border-dashed border-line2 bg-transparent text-header-m font-bold focus:border-primary focus:outline-none" />
                <span className="num text-desc text-hint">{r.hint}</span>
              </span>
              <button type="button" aria-label={`Giảm ${r.label.toLowerCase()}`} onClick={r.dec} className="h-11 w-11 rounded-m border border-line2 text-[20px] font-semibold">−</button>
              <button type="button" aria-label={`Tăng ${r.label.toLowerCase()}`} onClick={r.inc} className="h-11 w-11 rounded-m border border-line2 text-[20px] font-semibold">+</button>
            </div>
          ))}
          <div className="flex items-baseline justify-between py-3">
            <span className="text-body">Tiền tiêu hôm nay sẽ là</span>
            <span className="num font-display text-[20px] text-brand">{preview.left > 0 ? vnd(preview.allowance) : 'Hết ngân sách tháng'}</span>
          </div>
        </Section>
        <p className="px-1 text-desc text-hint">Thay đổi áp dụng từ bây giờ. Số của các ngày đã qua giữ nguyên.</p>
        <Section label="Thông báo" className="py-1">
          {[
            { label: 'Tin tốt buổi sáng', hint: 'Sau ngày tiêu trong mức, tối đa 2 lần mỗi tuần', on: goodnews, flip: () => setGoodnews(!goodnews) },
            { label: 'Ước lượng Chủ nhật', hint: '19:00 mỗi Chủ nhật, một câu hỏi', on: sunday, flip: () => setSunday(!sunday) },
          ].map((t) => (
            <label key={t.label} className="flex min-h-14 items-center gap-3 border-b border-line last:border-0">
              <span className="flex flex-1 flex-col">
                <span className="text-header-s font-semibold">{t.label}</span>
                <span className="text-desc text-hint">{t.hint}</span>
              </span>
              <input type="checkbox" role="switch" checked={t.on} onChange={t.flip} className="h-5 w-5 accent-primary" />
            </label>
          ))}
        </Section>
        {err && <ErrorNote message={err} />}
        <PrimaryButton onClick={() => save()}>Lưu thay đổi</PrimaryButton>
        <button type="button" onClick={() => save({ off: true })} className="h-12 text-header-s font-semibold text-hint underline underline-offset-4">
          Tắt tiền tiêu hôm nay và ngừng dùng dữ liệu
        </button>
      </div>
    </main>
  );
}
