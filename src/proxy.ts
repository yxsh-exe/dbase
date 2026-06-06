import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define protected and auth routes
  const protectedRoutes = ['/projects', '/dashboard', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/api/projects');
  
  const authRoutes = ['/sign-in', '/sign-up'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If it's neither protected nor an auth route, we can fast-path it
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  try {
    // Fetch session from better-auth
    const response = await fetch(new URL('/api/auth/get-session', request.nextUrl.origin), {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store'
    });
    
    const session = await response.json().catch(() => null);
    const isAuthenticated = session && session.session;

    // Protect private routes
    if (isProtectedRoute && !isAuthenticated) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Redirect away from auth pages if logged in
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/projects', request.url));
    }

  } catch (error) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Next.js best practice: skip all static assets and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
