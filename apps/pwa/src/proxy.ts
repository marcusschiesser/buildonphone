import { NextRequest, NextResponse } from 'next/server';
import { isPasswordProtectionEnabled, verifyAuthCookie, COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/config',
  '/login',
  '/next.svg',
  '/window.svg',
  '/globe.svg',
  '/file.svg',
  '/vercel.svg',
];

function isPublicPath(pathname: string): boolean {
  if (!pathname.startsWith('/api/') && pathname.includes('.')) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  if (!isPasswordProtectionEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  const authenticated = !!cookieValue && (await verifyAuthCookie(cookieValue));

  if (!authenticated) {
    const isApiRoute = pathname.startsWith('/api/');
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
