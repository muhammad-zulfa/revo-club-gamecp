import { EventCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createEventsWithReminders } from "@/lib/event-reminders";
import { parseCsvLine } from "@/lib/events";

function normalizeCategory(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "pit boss" || normalized === "pit_boss") return EventCategory.PIT_BOSS;
  if (normalized === "chip war" || normalized === "chip_war") return EventCategory.CHIP_WAR;
  if (normalized === "gvg") return EventCategory.GVG;
  return EventCategory.OTHER;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const file = form.get("csvFile");

  if (!(file instanceof File)) {
    return NextResponse.redirect(new URL("/events?error=csv", req.url), 303);
  }

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return NextResponse.redirect(new URL("/events?error=csv", req.url), 303);
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const titleIndex = headers.indexOf("title");
  const categoryIndex = headers.indexOf("category");
  const startIndex = headers.indexOf("startat");
  const endIndex = headers.indexOf("endat");
  const descriptionIndex = headers.indexOf("description");

  if (titleIndex === -1 || categoryIndex === -1 || startIndex === -1 || endIndex === -1) {
    return NextResponse.redirect(new URL("/events?error=csv", req.url), 303);
  }

  const data = lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const parsedStartAt = new Date(row[startIndex] ?? "");
    const parsedEndAt = new Date(row[endIndex] ?? "");

    if (!row[titleIndex] || Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime()) || parsedEndAt <= parsedStartAt) {
      return null;
    }

    return {
      title: row[titleIndex],
      category: normalizeCategory(row[categoryIndex] ?? ""),
      description: descriptionIndex === -1 ? null : row[descriptionIndex] || null,
      startAt: parsedStartAt,
      endAt: parsedEndAt,
      createdById: admin.userId === "env-admin" ? null : admin.userId,
    };
  }).filter((event): event is {
    title: string;
    category: EventCategory;
    description: string | null;
    startAt: Date;
    endAt: Date;
    createdById: string | null;
  } => Boolean(event));

  if (!data.length) {
    return NextResponse.redirect(new URL("/events?error=csv", req.url), 303);
  }

  await createEventsWithReminders(data);
  return NextResponse.redirect(new URL("/events?imported=1", req.url), 303);
}
