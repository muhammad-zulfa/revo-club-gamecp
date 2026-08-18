import { EventCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendDiscordEventReminder } from "@/lib/discord";
import { getDiscordSettings } from "@/lib/settings";

type EventInput = {
  title: string;
  description: string | null;
  category: EventCategory;
  startAt: Date;
  endAt: Date;
  attendanceMinutesRequired: number | null;
  discordVoiceChannelId?: string | null;
  createdById: string | null;
};

export function parseReminderOffsets(input: string) {
  const seen = new Set<number>();

  return input
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .sort((a, b) => b - a);
}

export async function getConfiguredReminderOffsets() {
  const settings = await getDiscordSettings();
  return parseReminderOffsets(settings.discordEventReminderOffsets);
}

export function buildEventReminderData(eventId: string, startAt: Date, offsets: number[]) {
  return offsets.map((minutesOffset) => ({
    eventId,
    minutesOffset,
    scheduledAt: new Date(startAt.getTime() - minutesOffset * 60 * 1000),
  }));
}

export async function createEventWithReminders(input: EventInput) {
  const offsets = await getConfiguredReminderOffsets();

  const event = await prisma.event.create({
    data: input,
  });

  if (offsets.length) {
    await prisma.eventReminder.createMany({
      data: buildEventReminderData(event.id, event.startAt, offsets),
    });
  }

  return event;
}

export async function createEventsWithReminders(inputs: EventInput[]) {
  if (!inputs.length) return [];

  const offsets = await getConfiguredReminderOffsets();
  const events = [];

  for (const input of inputs) {
    const event = await prisma.event.create({
      data: input,
    });

    if (offsets.length) {
      await prisma.eventReminder.createMany({
        data: buildEventReminderData(event.id, event.startAt, offsets),
      });
    }

    events.push(event);
  }

  return events;
}

function getReminderTimingLabel(minutesOffset: number) {
  if (minutesOffset > 0) {
    return `starts in ${minutesOffset} minute${minutesOffset === 1 ? "" : "s"}`;
  }

  if (minutesOffset === 0) {
    return "is starting now";
  }

  const minutesAfterStart = Math.abs(minutesOffset);
  return `started ${minutesAfterStart} minute${minutesAfterStart === 1 ? "" : "s"} ago`;
}

export async function dispatchDueEventReminders(now = new Date()) {
  const reminders = await prisma.eventReminder.findMany({
    where: {
      sentAt: null,
      scheduledAt: {
        lte: now,
      },
    },
    include: {
      event: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      const wasSent = await sendDiscordEventReminder({
        id: reminder.event.id,
        title: reminder.event.title,
        description: reminder.event.description,
        category: reminder.event.category,
        startAt: reminder.event.startAt,
        endAt: reminder.event.endAt,
        discordVoiceChannelId: reminder.event.discordVoiceChannelId,
        timingLabel: getReminderTimingLabel(reminder.minutesOffset),
      });

      if (wasSent) {
        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: {
            sentAt: now,
          },
        });
        sent += 1;
        await prisma.event.update({
          where: { id: reminder.event.id },
          data: { discordReminderSentAt: now },
        });
      }
    } catch (error) {
      failed += 1;
      console.error("Event reminder dispatch failed:", {
        reminderId: reminder.id,
        eventId: reminder.eventId,
        error,
      });
    }
  }

  return {
    total: reminders.length,
    sent,
    failed,
  };
}

export async function authorizeCronRequest(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected) return true;

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret")?.trim() ?? "";

  return bearer === expected || querySecret === expected;
}
