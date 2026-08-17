import { ApprovalStatus, GpLedgerEntryType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const recipientId = String(form.get("recipientId") ?? "").trim();
  const amount = Number.parseFloat(String(form.get("amount") ?? "0"));
  const note = String(form.get("note") ?? "").trim();

  if (!recipientId) {
    return NextResponse.redirect(new URL("/gp-wallet?error=recipient", req.url), 303);
  }

  if (recipientId === session.userId) {
    return NextResponse.redirect(new URL("/gp-wallet?error=same", req.url), 303);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.redirect(new URL("/gp-wallet?error=amount", req.url), 303);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const [sender, recipient] = await Promise.all([
        tx.user.findUnique({
          where: { id: session.userId },
          select: { id: true, gpBalance: true, name: true, approvalStatus: true },
        }),
        tx.user.findUnique({
          where: { id: recipientId },
          select: { id: true, name: true, approvalStatus: true },
        }),
      ]);

      if (!sender || sender.approvalStatus !== ApprovalStatus.APPROVED) {
        throw new Error("sender");
      }

      if (!recipient || recipient.approvalStatus !== ApprovalStatus.APPROVED) {
        throw new Error("recipient");
      }

      if (sender.gpBalance < amount) {
        throw new Error("balance");
      }

      await Promise.all([
        tx.user.update({
          where: { id: sender.id },
          data: { gpBalance: { decrement: amount } },
        }),
        tx.user.update({
          where: { id: recipient.id },
          data: { gpBalance: { increment: amount } },
        }),
      ]);

      await tx.gpLedgerEntry.createMany({
        data: [
          {
            userId: sender.id,
            relatedUserId: recipient.id,
            type: GpLedgerEntryType.TRANSFER_SENT,
            amount: -amount,
            note: note || `Transfer sent to ${recipient.name}`,
          },
          {
            userId: recipient.id,
            relatedUserId: sender.id,
            type: GpLedgerEntryType.TRANSFER_RECEIVED,
            amount,
            note: note || `Transfer received from ${sender.name}`,
          },
        ],
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "amount";
    const code =
      message === "recipient" || message === "same" || message === "balance" || message === "sender"
        ? message
        : "amount";

    return NextResponse.redirect(new URL(`/gp-wallet?error=${code === "sender" ? "recipient" : code}`, req.url), 303);
  }

  return NextResponse.redirect(new URL("/gp-wallet?sent=1", req.url), 303);
}
