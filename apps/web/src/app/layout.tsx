import { Toaster } from '@/components/ui/sonner';
import { publicSans } from '@/lib/fonts';
import type { Metadata } from 'next';
import './globals.css';

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
  return (
    <html lang='en'>
      <body className={`${publicSans.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
