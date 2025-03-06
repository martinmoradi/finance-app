import { sessionOptions } from '@/lib/api/auth/session.config';
import { SessionData } from '@repo/types';
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/'];
const publicRoutes = ['/signin', '/signup'];

export default async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );

  if (isProtectedRoute && !session.isAuthenticated) {
    return NextResponse.redirect(new URL('/signin', request.nextUrl));
  }

  if (isPublicRoute && session.isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
