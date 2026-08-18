import { EventCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendDiscordEventReminder } from "@/lib/discord";
import { createEventWithReminders, createEventsWithReminders } from "@/lib/event-reminders";
import {
  buildRecurringDates,
  isEventRepeatFrequency,
  parseDateInputWithOffset,
  parseDateTimeInputWithOffset,
} from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? EventCategory.OTHER) as EventCategory;
  const startAt = String(form.get("startAt") ?? "");
  const endAt = String(form.get("endAt") ?? "");
  const discordVoiceChannelId = String(form.get("discordVoiceChannelId") ?? "").trim();
  const sendDiscordReminder = String(form.get("sendDiscordReminder") ?? "") === "on";
  const repeat = String(form.get("repeat") ?? "none").trim();
  const repeatUntil = String(form.get("repeatUntil") ?? "").trim();
  const attendanceMinutesRequiredInput = String(
    form.get("attendanceMinutesRequired") ?? "",
  ).trim();
  const timezoneOffsetMinutes = Number.parseInt(
    String(form.get("timezoneOffsetMinutes") ?? "0"),
    10,
  );

  if (!title || !startAt || !endAt) {
    return NextResponse.redirect(new URL("/events?error=missing", req.url), 303);
  }

  const parsedStartAt = parseDateTimeInputWithOffset(
    startAt,
    Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0,
  );
  const parsedEndAt = parseDateTimeInputWithOffset(
    endAt,
    Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0,
  );

  if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime()) || parsedEndAt <= parsedStartAt) {
    return NextResponse.redirect(new URL("/events?error=range", req.url), 303);
  }

  if (!isEventRepeatFrequency(repeat)) {
    return NextResponse.redirect(new URL("/events?error=repeat", req.url), 303);
  }

  const attendanceMinutesRequired = attendanceMinutesRequiredInput
    ? Number.parseInt(attendanceMinutesRequiredInput, 10)
    : null;

  if (
    attendanceMinutesRequiredInput &&
    (
      attendanceMinutesRequired === null ||
      !Number.isFinite(attendanceMinutesRequired) ||
      attendanceMinutesRequired <= 0
    )
  ) {
    return NextResponse.redirect(new URL("/events?error=attendance", req.url), 303);
  }

  const parsedRepeatUntil = repeatUntil
    ? parseDateInputWithOffset(
        repeatUntil,
        Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0,
        true,
      )
    : null;
  const recurringDates = buildRecurringDates({
    startAt: parsedStartAt,
    endAt: parsedEndAt,
    repeat,
    repeatUntil: parsedRepeatUntil,
  });

  if (!recurringDates) {
    return NextResponse.redirect(new URL("/events?error=repeat", req.url), 303);
  }

  const eventInput = {
    title,
    description: description || null,
    category,
    attendanceMinutesRequired,
    discordVoiceChannelId: discordVoiceChannelId || null,
    createdById: admin.userId === "env-admin" ? null : admin.userId,
  };

  const events =
    recurringDates.length === 1
      ? [
          await createEventWithReminders({
            ...eventInput,
            startAt: parsedStartAt,
            endAt: parsedEndAt,
          }),
        ]
      : await createEventsWithReminders(
          recurringDates.map((occurrence) => ({
            ...eventInput,
            startAt: occurrence.startAt,
            endAt: occurrence.endAt,
          })),
        );

  const firstEvent = events[0];
  const createdCount = events.length;
  const savedParams = new URLSearchParams({
    saved: "1",
    count: String(createdCount),
  });

  if (sendDiscordReminder && firstEvent) {
    try {
      const sent = await sendDiscordEventReminder(firstEvent);

      if (sent) {
        await prisma.event.update({
          where: { id: firstEvent.id },
          data: { discordReminderSentAt: new Date() },
        });
        savedParams.set("discord", createdCount > 1 ? "sent-first" : "sent");
        return NextResponse.redirect(new URL(`/events?${savedParams.toString()}`, req.url), 303);
      }

      savedParams.set("discord", createdCount > 1 ? "skipped-first" : "skipped");
      return NextResponse.redirect(new URL(`/events?${savedParams.toString()}`, req.url), 303);
    } catch (error) {
      console.error("Discord event reminder failed:", error);
      savedParams.set("discord", createdCount > 1 ? "failed-first" : "failed");
      return NextResponse.redirect(new URL(`/events?${savedParams.toString()}`, req.url), 303);
    }
  }

  return NextResponse.redirect(new URL(`/events?${savedParams.toString()}`, req.url), 303);
}
