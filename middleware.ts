import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const protectedPath = ["/dashboard", "/members", "/online-members", "/guild", "/settings", "/approvals", "/events"].some((p) => req.nextUrl.pathname.startsWith(p));
  if (protectedPath && !req.cookies.get("rf_crm_session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/members/:path*", "/online-members/:path*", "/guild/:path*", "/settings/:path*", "/approvals/:path*", "/events/:path*"] };
