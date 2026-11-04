// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOKEN_NAME } from "./lib/auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_NAME)?.value; 
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!token && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname); 
    return NextResponse.redirect(loginUrl);
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};