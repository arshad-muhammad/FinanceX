import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isAuth = request.cookies.has("site_auth");
  const { pathname } = request.nextUrl;

  // Allow access to /login and /sh-admin-sh without site_auth cookie
  if (!isAuth && pathname !== "/login" && pathname !== "/sh-admin-sh") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuth && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Intercept dashboard routes and root page
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|vercel.svg).*)",
  ],
};
