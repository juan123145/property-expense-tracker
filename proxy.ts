import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Public routes — accessible without authentication
const PUBLIC_PATHS = ["/", "/login", "/invite"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/onboarding");

  // Unauthenticated + protected route → redirect to /login
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated + on login page → redirect to /dashboard
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|service-worker.js|test).*)"],
};
