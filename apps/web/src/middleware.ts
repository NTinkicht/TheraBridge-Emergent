import { NextResponse, type NextRequest } from 'next/server';

// Convenience redirect only. Every authorization decision is made by the API.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('__Host-tb_session') || req.cookies.has('tb_session');
  if (hasSession) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/app/:path*', '/account/:path*', '/select-context'] };
