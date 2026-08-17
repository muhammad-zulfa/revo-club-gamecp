import { NextResponse } from "next/server";
import { Race } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRace(value: string) {
  return value === Race.BELLATO || value === Race.CORA || value === Race.ACCRETIA
    ? value
    : null;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const worldName = String(form.get("worldName") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const race = parseRace(String(form.get("race") ?? "").trim());

  if (!name || !worldName || !race) {
    return NextResponse.redirect(new URL("/guild?error=invalid", req.url), 303);
  }

  const existingGuild = await prisma.guild.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existingGuild) {
    await prisma.guild.update({
      where: { id: existingGuild.id },
      data: {
        name,
        worldName,
        race,
        description: description || null,
      },
    });
  } else {
    await prisma.guild.create({
      data: {
        name,
        worldName,
        race,
        description: description || null,
      },
    });
  }

  return NextResponse.redirect(new URL("/guild?saved=1", req.url), 303);
}
