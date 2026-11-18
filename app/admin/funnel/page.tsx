'use client';
import { useEffect, useState } from 'react';
import { Header, Section, Spinner } from '@/components/ui';
import { api } from '@/lib/client';

interface Funnel { rows: { name: string; users: number; events: number }[]; recent: { user_id: string; name: string; props: Record<string, unknown>; at: string }[] }

const ORDER = [
  'allowance_setup_viewed', 'allowance_setup_completed', 'allowance_card_viewed', 'allowance_calendar_viewed',
  'allowance_success_line_viewed', 'allowance_explain_opened', 'allowance_quick_add', 'allowance_not_spending',
  'allowance_estimate_answered', 'allowance_goodnews_sent', 'allowance_goodnews_opened', 'allowance_settings_changed',
  'allowance_ai_parsed', 'allowance_ai_confirmed',
];

/** Events logged by the prototype, read straight from the events table (tracking plan, US10). */
export default function FunnelPage() {
  const [f, setF] = useState<Funnel | null>(null);
  useEffect(() => { api<Funnel>('/api/admin/funnel').then(setF); }, []);
  return (
    <main className="flex flex-col pb-24">
      <Header title="Event đã ghi" back="/" />
      {!f && <Spinner />}
      {f && (
        <div className="flex flex-col gap-3 px-4 pt-2">
          <p className="text-desc text-hint">Số liệu từ bảng events của prototype. Chỉ phản ánh thao tác demo, không phải người dùng thật.</p>
          <Section label="Theo event" className="overflow-x-auto py-1">
            <table className="w-full text-left text-desc">
              <thead><tr className="border-b border-line"><th className="py-2 font-semibold">Event</th><th className="py-2 text-right font-semibold">Người dùng</th><th className="py-2 text-right font-semibold">Lượt</th></tr></thead>
              <tbody>
                {ORDER.map((n) => {
                  const r = f.rows.find((x) => x.name === n);
                  return <tr key={n} className="border-b border-line last:border-0"><td className="py-2 font-mono text-[11px]">{n}</td><td className="num py-2 text-right">{r?.users ?? 0}</td><td className="num py-2 text-right">{r?.events ?? 0}</td></tr>;
                })}
              </tbody>
            </table>
          </Section>
          <Section label="Gần nhất" className="flex flex-col gap-1.5">
            <h2 className="text-header font-bold">30 event gần nhất</h2>
            {f.recent.map((e, i) => (
              <div key={i} className="border-b border-line py-1.5 text-desc last:border-0">
                <span className="font-semibold">{e.user_id}</span> · <span className="font-mono text-[11px]">{e.name}</span>
                <div className="truncate text-hint">{JSON.stringify(e.props)}</div>
              </div>
            ))}
          </Section>
        </div>
      )}
    </main>
  );
}
