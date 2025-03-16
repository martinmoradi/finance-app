import { Toaster } from '@/components/ui/sonner';
import { publicSans } from '@/lib/fonts';
import type { Metadata } from 'next';
import './globals.css';
import { useLocale } from 'next-intl';

export const metadata: Metadata = {
  title: 'Personal finance app',
  description: 'Manage your money with ease',
  icons: {
    icon: '/favicon-32x32.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = useLocale();
  return (
    <html lang={locale}>
      <body className={`${publicSans.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
