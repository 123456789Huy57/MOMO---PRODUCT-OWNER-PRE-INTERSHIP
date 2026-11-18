'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Chip, ErrorNote, Header, PrimaryButton, Section, Spinner } from '@/components/ui';
import { api } from '@/lib/client';
import { allowanceFormula, vnd } from '@/lib/engine';

interface Suggestion {
  month: string; suggested: number | null; presets: number[]; spentBefore: number; daysLeft: number; eligible: boolean;
  bills: { id: string; payee: string; dueDay: number; amount: number; paid: boolean }[];
}

const parseVnd = (s: string) => Number(s.replace(/\D/g, '')) || 0;

/** S1: suggested budget, savings goal, bill confirmation and consent on one screen (FR01–FR04, BR13, NFR06). */
export default function Setup() {
  const router = useRouter();
  const [s, setS] = useState<Suggestion | null>(null);
  const [budget, setBudget] = useState(0);
  const [edited, setEdited] = useState(false);
  const [goal, setGoal] = useState(1_000_000);
  const [kept, setKept] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Suggestion>('/api/setup/suggestion').then((r) => {
      setS(r);
      setBudget(r.suggested ?? r.presets[1]);
      setKept(Object.fromEntries(r.bills.map((b) => [b.id, true])));
    }).catch((e) => setErr(e.message));
  }, []);

  const R = useMemo(() => (s ? s.bills.filter((b) => kept[b.id] && !b.paid).reduce((a, b) => a + b.amount, 0) : 0), [s, kept]);
  const preview = s ? allowanceFormula(budget, goal, s.spentBefore, R, s.daysLeft, 0) : null;
  const goalError = goal > budget / 2 ? 'Mục tiêu để dành tối đa bằng một nửa ngân sách' : '';

  async function start() {
    setBusy(true); setErr('');
    try {
      await api('/api/setup', { method: 'POST', json: { budget, goal, edited, consent: true, bills: Object.entries(kept).map(([id, k]) => ({ id, kept: k })) } });
      router.push('/');
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <main className="flex min-h-dvh flex-col pb-6">
      <Header title="Tiền tiêu hôm nay" back="/" />
      {!s && !err && <Spinner />}
      {s && (
        <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
          <Section label="Ngân sách tháng" className="flex flex-col gap-1.5">
            <label htmlFor="budget" className="text-desc text-hint">Ngân sách tháng {Number(s.month.slice(5))}</label>
            <input id="budget" inputMode="numeric" value={vnd(budget)}
              onChange={(e) => { setBudget(parseVnd(e.target.value)); setEdited(true); }}
              className="num w-full border-b border-line2 bg-transparent py-1 font-display text-headline text-ink focus:border-primary focus:outline-none" />
            {s.suggested ? (
              <span className="text-desc text-hint">Gợi ý từ mức chi giữa của 3 tháng gần nhất. Bạn sửa được.</span>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="w-full text-desc text-hint">Chưa đủ 30 ngày dữ liệu. Chọn một mức để bắt đầu:</span>
                {s.presets.map((p) => <Chip key={p} on={budget === p} onClick={() => setBudget(p)}>{vnd(p)}</Chip>)}
              </div>
            )}
          </Section>

          <Section label="Để dành trước" className="flex flex-col gap-2.5">
            <h2 className="text-header font-bold">Để dành trước mỗi tháng</h2>
            <div className="flex flex-wrap gap-2">
              {[0, 500_000, 1_000_000].map((v) => <Chip key={v} on={goal === v} onClick={() => setGoal(v)}>{v === 0 ? 'Không' : vnd(v)}</Chip>)}
              <Chip on={![0, 500_000, 1_000_000].includes(goal)} onClick={() => setGoal(Math.max(100_000, Math.round(budget / 10 / 100_000) * 100_000))}>Khác</Chip>
            </div>
            {![0, 500_000, 1_000_000].includes(goal) && (
              <label className="flex flex-col gap-1 text-desc text-hint">Số tiền khác
                <input inputMode="numeric" value={vnd(goal)} onChange={(e) => setGoal(parseVnd(e.target.value))}
                  className="num rounded-s border border-line2 px-3 py-2 text-body text-ink focus:border-primary focus:outline-none" />
              </label>
            )}
            {goalError && <ErrorNote message={goalError} />}
          </Section>

          {s.bills.length > 0 && (
            <Section label="Hóa đơn định kỳ" className="flex flex-col py-2">
              <h2 className="py-1.5 text-header font-bold">Hóa đơn tháng này, giữ sẵn tiền</h2>
              {s.bills.map((b) => (
                <label key={b.id} className="flex min-h-12 items-center gap-3 border-t border-line">
                  <input type="checkbox" checked={!!kept[b.id]} onChange={() => setKept({ ...kept, [b.id]: !kept[b.id] })} className="h-5 w-5 accent-primary" />
                  <span className="flex flex-1 flex-col">
                    <span className="text-header-s font-semibold">{b.payee}</span>
                    <span className="text-desc text-hint">Ngày {b.dueDay}{b.paid ? ', đã trả tháng này' : ''}</span>
                  </span>
                  <span className="num text-header-s font-semibold">{vnd(b.amount)}</span>
                </label>
              ))}
            </Section>
          )}

          <section aria-label="Xem trước" className="rounded-m bg-tonal p-4">
            <span className="text-body text-ink2">Với lựa chọn này, hôm nay bạn tiêu được khoảng</span>
            <p className="num font-display text-headline-l text-brand">{preview && preview.left > 0 ? vnd(preview.allowance) : 'Ngân sách đã hết'}</p>
          </section>

          <div className="mt-auto flex flex-col gap-2.5 pt-2">
            {err && <ErrorNote message={err} />}
            <p className="text-desc text-hint">Khi bấm Bắt đầu, bạn đồng ý cho MoMo dùng lịch sử giao dịch để tính số tiền này. Bạn tắt được bất cứ lúc nào trong Cài đặt.</p>
            <PrimaryButton onClick={start} disabled={busy || !!goalError || budget <= 0}>{busy ? 'Đang lưu...' : 'Bắt đầu'}</PrimaryButton>
          </div>
        </div>
      )}
      {err && !s && <div className="p-4"><ErrorNote message={err} /></div>}
    </main>
  );
}
