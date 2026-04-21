import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/evaluate',
  '/grades',
  '/admin',
];

export function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  const pathname = request.nextUrl.pathname;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !sessionId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect logged-in users away from login page
  if (pathname === '/' && sessionId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
