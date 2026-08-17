import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hardDeleteUser } from "@/lib/approvals";

export async function POST(req: Request, context: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { userId } = await context.params;

  await hardDeleteUser(userId, admin.name);

  return NextResponse.redirect(new URL("/approvals?deleted=1", req.url), 303);
}
