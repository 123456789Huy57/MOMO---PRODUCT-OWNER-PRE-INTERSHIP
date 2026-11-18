'use client';
import Link from 'next/link';

export default function Tabs({ active }: { active: 'overview' | 'calendar' }) {
  const cls = (on: boolean) => `flex-1 border-b-[2.5px] py-2.5 text-center text-header-s ${on ? 'border-primary font-bold text-pinkdeep' : 'border-transparent font-medium text-hint'}`;
  return (
    <nav aria-label="Mục" className="flex px-3">
      <Link href="/" className={cls(active === 'overview')} aria-current={active === 'overview' ? 'page' : undefined}>Tổng quan</Link>
      <Link href="/calendar" className={cls(active === 'calendar')} aria-current={active === 'calendar' ? 'page' : undefined}>Lịch</Link>
    </nav>
  );
}

