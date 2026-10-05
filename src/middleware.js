import { NextResponse } from 'next/server';
import { handleWebsiteMiddleware } from './lib/middleware/website.js';

export function middleware(request) {
  const websiteResponse = handleWebsiteMiddleware(request);
  if (websiteResponse) {
    return websiteResponse;
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|sitemap.xml|robots.txt).*)',
  ],
};
