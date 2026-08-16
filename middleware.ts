import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // ── Not logged in → send to login ─────────────────────────────────────────
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string;

  // ── /admin → admin only ───────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // ── /staff → staff only ───────────────────────────────────────────────────
  if (pathname.startsWith("/staff")) {
    if (role === "admin") {
      // Admins should use the admin dashboard.
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (role !== "staff") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};