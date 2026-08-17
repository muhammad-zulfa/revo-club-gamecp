import { NextResponse } from "next/server";
import { ApprovalStatus, UserRole } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/app-url";
import { createSessionValue, getApprovalMessage, getSessionCookieName, verifyPassword } from "@/lib/auth";
import { getPostLoginDestination } from "@/lib/profile";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const baseUrl = await getAppBaseUrl(new URL(req.url).origin);
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const allowedEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@guild.local";
  const allowedPassword = process.env.DEMO_ADMIN_PASSWORD ?? "admin123";

  if (email === allowedEmail && password === allowedPassword) {
    const res = NextResponse.redirect(new URL("/dashboard", baseUrl), 303);
    res.cookies.set(getSessionCookieName(), createSessionValue({
      email: allowedEmail,
      name: "Guild Admin",
      role: UserRole.ADMIN,
      userId: "env-admin"
    }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return res;
  }

  const user = await prisma.user.findUnique({ where: { email } }).catch(() => null);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl), 303);
  }

  if (user.approvalStatus !== ApprovalStatus.APPROVED) {
    return NextResponse.redirect(
      new URL(`/login?error=${user.approvalStatus.toLowerCase()}&message=${encodeURIComponent(getApprovalMessage(user.approvalStatus))}`, baseUrl),
      303
    );
  }

  const destination = await getPostLoginDestination(user.id, user.role);
  const res = NextResponse.redirect(new URL(destination, baseUrl), 303);
  res.cookies.set(getSessionCookieName(), createSessionValue({
    email: user.email,
    name: user.name,
    role: user.role,
    userId: user.id
  }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
