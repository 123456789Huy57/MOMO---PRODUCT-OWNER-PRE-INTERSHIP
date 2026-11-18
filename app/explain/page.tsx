'use client';
import { useEffect, useState } from 'react';
import { Header, Section, Spinner } from '@/components/ui';
import { api, track } from '@/lib/client';
import { vnd, type DayResult } from '@/lib/engine';

type Explain = DayResult & {
  viaMomo: number; added: number;
  upcoming: { name: string; dueDay: number; amount: number }[];
  estimate: { range: string; weekly: number; answeredOn: string } | null;
};

/** S4: every term of the formula and how much of the spending MoMo can see (FR10, US07). */
export default function ExplainPage() {
  const [x, setX] = useState<Explain | null>(null);
  useEffect(() => {
    api<Explain>('/api/allowance/explain').then((r) => {
      setX(r);
      const total = r.viaMomo + r.added;
      track('allowance_explain_opened', { coverage_share: total > 0 ? Math.round((r.viaMomo / total) * 100) / 100 : null });
    });
  }, []);
  const month = x ? Number(x.date.slice(5, 7)) : 0;
  const rows = x ? [
    { op: '', label: `Ngân sách tháng ${month}`, note: 'Bạn đặt khi thiết lập', amt: vnd(x.B) },
    { op: '−', label: 'Để dành trước', note: 'Giữ riêng từ ngày 1', amt: vnd(x.G) },
    { op: '−', label: 'Đã chi đến hết hôm qua', note: `Qua MoMo ${vnd(x.viaMomo)}, bạn tự thêm ${vnd(x.added)}`, amt: vnd(x.S) },
    { op: '−', label: 'Hóa đơn sắp tới', note: x.upcoming.length ? x.upcoming.map((b) => `${b.name} ngày ${b.dueDay}`).join(', ') : 'Không còn hóa đơn trong tháng', amt: vnd(x.R) },
    { op: '÷', label: 'Số ngày còn lại', note: 'Tính cả hôm nay', amt: `${x.D} ngày` },
    { op: '−', label: 'Dự phòng chi ngoài MoMo', note: x.estimate ? `Từ ước lượng ngày ${x.estimate.answeredOn.slice(8)}/${x.estimate.answeredOn.slice(5, 7)}: khoảng ${vnd(x.estimate.weekly)} một tuần` : 'Chưa ước lượng tuần này', amt: `${vnd(x.E)}/ngày` },
  ] : [];

  return (
    <main className="flex flex-col pb-24">
      <Header title="Vì sao là con số này?" back="/" />
      {!x && <Spinner />}
      {x && x.state === 'notsetup' && <p className="p-4 text-body">Bạn chưa thiết lập tiền tiêu hôm nay cho tháng này.</p>}
      {x && x.state !== 'notsetup' && (
        <div className="flex flex-col gap-3 px-4 pt-2">
          <p className="text-body">Mỗi sáng, MoMo lấy phần ngân sách còn lại sau khi giữ riêng tiền để dành và hóa đơn sắp tới, rồi chia đều cho số ngày còn lại trong tháng.</p>
          <Section label="Cách tính sáng nay" className="py-1.5">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[20px_1fr_auto] items-center gap-x-2 border-b border-line py-2.5">
                <span className="text-center text-header font-bold text-pinkdeep">{r.op}</span>
                <span className="flex flex-col">
                  <span className="text-header-s font-semibold">{r.label}</span>
                  <span className="num text-desc text-hint">{r.note}</span>
                </span>
                <span className="num text-header-s font-semibold">{r.amt}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between pt-3">
              <span className="text-header-s font-semibold">Tiền tiêu sáng nay</span>
              <span className="num font-display text-headline text-brand">{vnd(x.allowance)}</span>
            </div>
            <p className="num pb-2 text-desc text-hint">
              {x.left > 0 ? `${vnd(x.left)} chia ${x.D} ngày${x.E ? `, trừ ${vnd(x.E)} dự phòng` : ''}, làm tròn xuống đến nghìn đồng.` : 'Phần ngân sách còn lại đã hết, nên không có số tiền mỗi ngày.'}
            </p>
          </Section>
          <Section label="Không tính vào chi tiêu" className="flex flex-col gap-2">
            <h2 className="text-header font-bold">Không tính vào chi tiêu</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-body">
              <li>Nạp, rút tiền và chuyển giữa các tài khoản của bạn</li>
              <li>Hạn mức Ví Trả Sau. Khoản đã trả bằng Ví Trả Sau vẫn tính là chi tiêu</li>
              <li>Khoản chuyển bạn đánh dấu &quot;không phải chi tiêu&quot;</li>
            </ul>
          </Section>
          <p className="rounded-m bg-tonal p-3.5 text-body text-ink2">Tiền mặt và chuyển khoản ngân hàng MoMo không thấy được. Bạn thêm nhanh từng khoản, hoặc trả lời ước lượng mỗi Chủ nhật để con số sát hơn.</p>
        </div>
      )}
    </main>
  );
}
