import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const sessionCookie =
    req.cookies.get("__Secure-authjs.session-token") ||
    req.cookies.get("authjs.session-token");
  const isLoggedIn = !!sessionCookie;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/chat", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|sounds|favicon.ico|manifest).*)" ],
};
