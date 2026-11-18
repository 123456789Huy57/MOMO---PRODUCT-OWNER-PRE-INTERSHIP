import type { Metadata, Viewport } from 'next';
import './globals.css';
import DemoBar from '@/components/DemoBar';

export const metadata: Metadata = {
  title: 'Tiền Tiêu Hôm Nay · Prototype học thuật',
  description: 'Prototype của tính năng Tiền Tiêu Hôm Nay cho Quản lý chi tiêu, báo cáo kiến tập UEL.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FDCADE' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Momo+Trust+Display&family=Momo+Trust+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="relative mx-auto min-h-dvh max-w-[430px] overflow-x-hidden bg-page shadow-light" style={{ backgroundImage: 'linear-gradient(180deg, #FDCADE 0px, #F2F2F6 154px)', backgroundRepeat: 'no-repeat' }}>
          {children}
        </div>
        <DemoBar />
      </body>
    </html>
  );
}
