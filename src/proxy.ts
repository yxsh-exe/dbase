import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith('/projects') || pathname.startsWith('/api/projects');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  try {
    const response = await fetch(new URL('/api/auth/get-session', request.nextUrl.origin), {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const session = await response.json();

    if (!session || !session.session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  } catch (error) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.)(?!.+__next).*)', '/', '/(api|trpc)(.*)'],
};
