'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorNote, PrimaryButton, SecondaryButton, Sheet } from '@/components/ui';
import { api } from '@/lib/client';
import { RANGE_MIDPOINT, floor1000, vnd, type EstimateRange } from '@/lib/engine';

const OPTIONS: { id: EstimateRange; label: string }[] = [
  { id: 'none', label: 'Gần như không có' },
  { id: 'under200', label: 'Dưới 200.000đ' },
  { id: '200to500', label: '200.000đ đến 500.000đ' },
  { id: '500to1000', label: '500.000đ đến 1.000.000đ' },
];

/** S7: one-tap weekly estimate of off-MoMo spending (FR13, BR11). */
export default function Sunday() {
  const router = useRouter();
  const [pick, setPick] = useState<EstimateRange>('under200');
  const [err, setErr] = useState('');
  const e = floor1000(RANGE_MIDPOINT[pick] / 7);
  async function save(skipped = false) {
    try { await api('/api/estimates', { method: 'POST', json: skipped ? { skipped: true } : { range: pick } }); router.push('/'); }
    catch (x) { setErr((x as Error).message); }
  }
  return (
    <Sheet label="Ước lượng tuần này" onClose={() => router.push('/')}>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[20px] leading-7">Tuần này bạn tiêu ngoài MoMo khoảng bao nhiêu?</h1>
        <p className="text-body text-hint">Chỉ cần ước lượng. Tiền mặt, chuyển khoản ngân hàng, thẻ.</p>
      </div>
      <div role="radiogroup" aria-label="Khoảng tiền" className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} onClick={() => setPick(o.id)}
            className={`flex min-h-[52px] items-center justify-between rounded-m border px-4 text-left ${pick === o.id ? 'border-primary bg-selected' : 'border-line2'}`}>
            <span className="text-header font-semibold">{o.label}</span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${pick === o.id ? 'border-primary' : 'border-[#B9B9B9]'}`}>
              {pick === o.id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
          </button>
        ))}
      </div>
      <p className="num text-body text-ink2">
        {e === 0 ? 'Tuần tới MoMo không giữ thêm khoản nào cho chi tiêu ngoài MoMo.' : `Tuần tới, mỗi ngày MoMo giữ lại khoảng ${vnd(e)} cho các khoản này, để số tiền tiêu hôm nay không cao hơn thực tế.`}
      </p>
      {err && <ErrorNote message={err} />}
      <div className="flex gap-2.5">
        <SecondaryButton onClick={() => save(true)}>Bỏ qua tuần này</SecondaryButton>
        <PrimaryButton onClick={() => save(false)}>Lưu</PrimaryButton>
      </div>
    </Sheet>
  );
}
