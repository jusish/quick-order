import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has("AUTH_SESSION_FLAG");

  // Clean pathname for checking (remove locale prefixes)
  const pathWithoutLocale = pathname.replace(/^\/(en|fr|rw)(\/|$)/, "/");

  // Public paths
  const isLoginPage = pathWithoutLocale === "/login";
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes("favicon.ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png");

  if (isAsset) {
    return NextResponse.next();
  }

  // 1. Root redirect
  if (pathWithoutLocale === "/") {
    const target = isAuthenticated ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 2. Auth checks
  if (!isAuthenticated && !isLoginPage) {
    // Redirect to login if trying to access protected pages while unauthenticated
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isLoginPage) {
    // Redirect to dashboard if logged in and trying to hit login page
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except api, static assets, images, favicon
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)",
  ],
};
