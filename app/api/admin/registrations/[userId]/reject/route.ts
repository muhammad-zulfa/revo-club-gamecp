import { ApprovalStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setUserApprovalStatus } from "@/lib/approvals";

export async function POST(req: Request, context: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { userId } = await context.params;

  await setUserApprovalStatus(userId, ApprovalStatus.REJECTED, admin.name);

  return NextResponse.redirect(new URL("/approvals?updated=1", req.url), 303);
}
