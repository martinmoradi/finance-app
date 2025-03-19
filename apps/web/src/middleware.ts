import { sessionOptions } from '@/features/auth/config/session.config';
import { SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { Locale, routing } from './i18n/routing';

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Protected and public routes (patterns without locale prefix)
const protectedPaths = ['/'];
const publicPaths = ['/login', '/signup'];

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Extract locale from path if it exists
  const pathParts = path.split('/');
  const potentialLocale = pathParts.length > 1 ? pathParts[1] : '';
  const hasLocalePrefix = routing.locales.includes(potentialLocale as Locale);

  // Get session for auth check
  const session = await getIronSession<SessionData>(
    request,
    NextResponse.next(),
    sessionOptions,
  );

  // Check if we're on a protected or public route (after locale extraction)
  const pathWithoutLocale = hasLocalePrefix
    ? '/' + pathParts.slice(2).join('/')
    : path;
  const cleanPath = pathWithoutLocale || '/';

  const isProtectedPath = protectedPaths.includes(cleanPath);
  const isPublicPath = publicPaths.includes(cleanPath);

  // Get the target locale for redirects
  const targetLocale = hasLocalePrefix
    ? (potentialLocale as Locale)
    : routing.defaultLocale;

  // Handle authentication redirects
  if (isProtectedPath && !session.isAuthenticated) {
    // User not authenticated trying to access protected route
    return NextResponse.redirect(
      new URL(`/${targetLocale}/signup`, request.url),
    );
  }

  if (isPublicPath && session.isAuthenticated) {
    // User already authenticated trying to access public route (login/signup)
    return NextResponse.redirect(new URL(`/${targetLocale}`, request.url));
  }

  // If no auth redirects needed, use the intl middleware
  const response = intlMiddleware(request);

  // Add request ID header to the intlMiddleware response
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('x-request-id', requestId);

  // Return the modified intlMiddleware response
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
