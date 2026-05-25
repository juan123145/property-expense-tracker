import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Protect app routes, invite routes, and API routes (except NextAuth itself)
  matcher: [
    "/(app)/:path*",
    "/invite/:path*",
    "/api/((?!auth/).*)",
  ],
};
