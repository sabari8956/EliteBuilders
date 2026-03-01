import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIVATE_PATH_PREFIXES = ["/dashboard", "/onboarding", "/sponsor"];
const SESSION_COOKIE_NAME = "platform_session";

export function middleware(request: NextRequest) {
  const requiresSession = PRIVATE_PATH_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (!requiresSession) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (hasSession) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.searchParams.set("auth", "required");

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/sponsor/:path*"],
};
