import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permite acesso público ao formulário de login do portal e assets estáticos
  if (
    pathname === '/portal/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Verifica proteção para todas as sub-rotas de /portal/
  if (pathname.startsWith('/portal')) {
    const sessionToken = request.cookies.get('rrd_session_token')?.value || (process.env.ACCESS_V1_ENABLED==='true'?request.cookies.get('access_v1')?.value:null);

    if (!sessionToken) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*'],
};
