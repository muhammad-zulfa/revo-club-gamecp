import { NextResponse } from "next/server";
import { GpLedgerEntryType, MemberStatus, Race } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { isValidClassForRace } from "@/lib/member-profile-options";
import { prisma } from "@/lib/prisma";

function parseRace(value: string) {
  return value === Race.BELLATO || value === Race.CORA || value === Race.ACCRETIA
    ? value
    : null;
}

function parseStatus(value: string) {
  return value === MemberStatus.ACTIVE ||
    value === MemberStatus.INACTIVE ||
    value === MemberStatus.TRIAL
    ? value
    : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const form = await req.formData();
  const originalNickname = String(form.get("originalNickname") ?? "").trim();
  const nickname = String(form.get("nickname") ?? "").trim();
  const level = Number.parseInt(String(form.get("level") ?? ""), 10);
  const className = String(form.get("className") ?? "").trim();
  const role = String(form.get("role") ?? "").trim() || "Member";
  const race = parseRace(String(form.get("race") ?? "").trim());
  const status = parseStatus(String(form.get("status") ?? "").trim());
  const isOnline = String(form.get("isOnline") ?? "") === "on";
  const gpBalance = Number.parseFloat(String(form.get("gpBalance") ?? "0"));

  if (
    !nickname ||
    !Number.isFinite(level) ||
    level < 1 ||
    !className ||
    !race ||
    !status ||
    !isValidClassForRace(race, className) ||
    !Number.isFinite(gpBalance) ||
    gpBalance < 0
  ) {
    return NextResponse.redirect(new URL("/members?error=invalid", req.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    const existingMember = await tx.guildMember.findUnique({
      where: { id },
      select: {
        userId: true,
      },
    });

    await tx.guildMember.update({
      where: { id },
      data: {
        nickname,
        level,
        className,
        role,
        race,
        status,
        isOnline,
        lastSeenAt: isOnline ? null : new Date(),
      },
    });

    const memberUser = existingMember?.userId
      ? await tx.user.findUnique({
          where: { id: existingMember.userId },
          select: {
            id: true,
            gpBalance: true,
          },
        })
      : await tx.user.findFirst({
          where: {
            OR: [{ name: originalNickname }, { name: nickname }],
          },
          select: {
            id: true,
            gpBalance: true,
          },
        });

    if (!memberUser) return;

    const delta = gpBalance - memberUser.gpBalance;

    await tx.user.update({
      where: { id: memberUser.id },
      data: {
        gpBalance,
      },
    });

    if (Math.abs(delta) > 0.0001) {
      await tx.gpLedgerEntry.create({
        data: {
          userId: memberUser.id,
          type: GpLedgerEntryType.ADMIN_ADJUSTMENT,
          amount: delta,
          note: `Admin adjusted balance to ${gpBalance.toLocaleString("en-US")} GP`,
        },
      });
    }
  });

  return NextResponse.redirect(new URL("/members?updated=1", req.url), 303);
}
