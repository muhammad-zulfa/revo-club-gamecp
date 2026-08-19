import { Race, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isValidClassForRace } from "@/lib/member-profile-options";
import { prisma } from "@/lib/prisma";
import { ensureApprovedMemberProfile } from "@/lib/profile";

function parseRace(value: string) {
  return value === Race.BELLATO || value === Race.CORA || value === Race.ACCRETIA ? value : null;
}

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  if (session.role !== UserRole.MEMBER) {
    return NextResponse.redirect(new URL("/dashboard", req.url), 303);
  }

  const member = await ensureApprovedMemberProfile(session.userId);

  if (!member) {
    return NextResponse.redirect(new URL("/dashboard", req.url), 303);
  }

  const form = await req.formData();
  const nickname = String(form.get("nickname") ?? "").trim();
  const className = String(form.get("className") ?? "").trim();
  const level = Number.parseInt(String(form.get("level") ?? ""), 10);
  const race = parseRace(String(form.get("race") ?? "").trim());

  if (
    !nickname ||
    !className ||
    !Number.isFinite(level) ||
    level < 1 ||
    !race ||
    !isValidClassForRace(race, className)
  ) {
    return NextResponse.redirect(new URL("/profile?error=invalid", req.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.guildMember.update({
      where: { id: member.id },
      data: {
        nickname,
        className,
        level,
        race,
      },
    });

    await tx.user.update({
      where: { id: session.userId },
      data: {
        profileCompleted: true,
      },
    });
  });

  return NextResponse.redirect(new URL("/dashboard", req.url), 303);
}
