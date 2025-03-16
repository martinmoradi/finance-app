import { Locale, locales } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
}) {
  // Await the params object to handle the asynchronous nature of dynamic route params
  const { locale } = await params;

  // Validate that the incoming locale is supported
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    // The NextIntlClientProvider will automatically get messages from the server
    // via the request.ts configuration
    <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>
  );
}

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
