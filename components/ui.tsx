'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Top navigation: 56px bar, round back button, MoMo Trust Display title (momo-kits header spec). */
export function Header({ title, back = '/', right }: { title: string; back?: string | null; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="flex h-14 items-center gap-2 px-3">
      {back !== null && (
        <button type="button" aria-label="Quay lại" onClick={() => (back ? router.push(back) : router.back())}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink">
          <BackIcon />
        </button>
      )}
      <h1 className="flex-1 font-display text-header-m text-ink">{title}</h1>
      {right}
    </header>
  );
}

export function PrototypeTag() {
  return <span className="rounded-s bg-white/80 px-2 py-0.5 text-desc font-semibold text-pinkdeep">Prototype học thuật</span>;
}

export function Section({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className={`rounded-m bg-white p-4 ${className}`}>
      {children}
    </section>
  );
}

export function PrimaryButton({ children, onClick, href, disabled, type = 'button', className = '' }: {
  children: React.ReactNode; onClick?: () => void; href?: string; disabled?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  const cls = `flex h-12 w-full items-center justify-center rounded-s bg-primary px-4 text-header font-bold text-white disabled:bg-line2 ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function SecondaryButton({ children, onClick, href, className = '' }: { children: React.ReactNode; onClick?: () => void; href?: string; className?: string }) {
  const cls = `flex h-12 w-full items-center justify-center rounded-s border border-primary bg-white px-4 text-header font-bold text-pinkdeep ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

export function Chip({ on, onClick, children, className = '' }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 text-header-s font-semibold ${on ? 'border-primary bg-primary text-white' : 'border-line2 bg-white text-ink'} ${className}`}>
      {children}
    </button>
  );
}

/** Bottom sheet over a 50% black scrim (momo-kits BottomSheet). */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-[430px] flex-col justify-end">
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <section role="dialog" aria-label={label} className="relative flex max-h-[90dvh] flex-col gap-3.5 overflow-y-auto rounded-t-l bg-white px-4 pb-6 pt-2">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-s bg-line2" />
        {children}
      </section>
    </div>
  );
}

export function Spinner() {
  return <div role="status" aria-label="Đang tải" className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-2 border-line2 border-t-primary" />;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="rounded-s bg-[#FEE8EA] px-3 py-2 text-body text-[#C41B24]">{message}</p>;
}
