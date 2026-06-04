import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/projects(.*)', '/api/projects(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-up', req.url));
    }
  }
});

export const config = {
  matcher: ['/((?!.+\\.)(?!.+__next).*)', '/', '/(api|trpc)(.*)'],
};
