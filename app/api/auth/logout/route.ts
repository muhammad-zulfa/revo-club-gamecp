import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getSessionCookieName } from "@/lib/auth";

export async function POST(req: Request) {
  const baseUrl = await getAppBaseUrl(new URL(req.url).origin);
  const res = NextResponse.redirect(new URL("/login", baseUrl), 303);
  res.cookies.set(getSessionCookieName(), "", { maxAge: 0, path: "/" });
  return res;
}
