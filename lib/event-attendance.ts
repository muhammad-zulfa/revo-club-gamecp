import { EventAttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDiscordSettings } from "@/lib/settings";

const DEFAULT_ATTENDANCE_MINUTES = 10;

function getElapsedSeconds(startAt: Date, endAt: Date) {
  return Math.max(0, Math.floor((endAt.getTime() - startAt.getTime()) / 1000));
}

export async function getConfiguredAttendanceMinutes() {
  const settings = await getDiscordSettings();
  const parsed = Number.parseInt(settings.discordEventAttendanceMinutes.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ATTENDANCE_MINUTES;
}

export async function getConfiguredAttendanceSeconds() {
  return (await getConfiguredAttendanceMinutes()) * 60;
}

export async function findActiveEventForVoiceChannel(
  voiceChannelId: string,
  at = new Date(),
) {
  return prisma.event.findFirst({
    where: {
      discordVoiceChannelId: voiceChannelId,
      startAt: { lte: at },
      endAt: { gte: at },
    },
    orderBy: [{ startAt: "desc" }],
  });
}

export async function recordAttendanceJoin(input: {
  discordId: string;
  discordHandle?: string | null;
  voiceChannelId: string;
  joinedAt?: Date;
}) {
  const joinedAt = input.joinedAt ?? new Date();
  const event = await findActiveEventForVoiceChannel(input.voiceChannelId, joinedAt);

  if (!event) {
    return { event: null, attendance: null, shouldSendDm: false };
  }

  const user = await prisma.user.findUnique({
    where: { discordId: input.discordId },
    select: { id: true, discordHandle: true },
  });
  const existing = await prisma.eventAttendance.findUnique({
    where: {
      eventId_discordId: {
        eventId: event.id,
        discordId: input.discordId,
      },
    },
  });
  const discordHandle = input.discordHandle ?? user?.discordHandle ?? existing?.discordHandle ?? null;

  if (existing?.lastJoinedAt && existing.currentVoiceChannelId === input.voiceChannelId) {
    return {
      event,
      attendance: existing,
      shouldSendDm: !existing.dmSentAt,
    };
  }

  const attendance = existing
    ? await prisma.eventAttendance.update({
        where: { id: existing.id },
        data: {
          discordHandle,
          currentVoiceChannelId: input.voiceChannelId,
          lastJoinedAt: joinedAt,
          status: existing.qualifiedAt
            ? EventAttendanceStatus.PRESENT
            : EventAttendanceStatus.IN_VOICE,
        },
      })
    : await prisma.eventAttendance.create({
        data: {
          eventId: event.id,
          userId: user?.id ?? null,
          discordId: input.discordId,
          discordHandle,
          currentVoiceChannelId: input.voiceChannelId,
          firstJoinedAt: joinedAt,
          lastJoinedAt: joinedAt,
          status: EventAttendanceStatus.IN_VOICE,
        },
      });

  return {
    event,
    attendance,
    shouldSendDm: !attendance.dmSentAt,
  };
}

export async function recordAttendanceLeave(input: {
  discordId: string;
  previousVoiceChannelId: string;
  leftAt?: Date;
}) {
  const leftAt = input.leftAt ?? new Date();
  const minSeconds = await getConfiguredAttendanceSeconds();
  const attendance = await prisma.eventAttendance.findFirst({
    where: {
      discordId: input.discordId,
      currentVoiceChannelId: input.previousVoiceChannelId,
      lastJoinedAt: { not: null },
    },
    include: {
      event: true,
    },
    orderBy: [{ event: { startAt: "desc" } }],
  });

  if (!attendance || !attendance.lastJoinedAt) {
    return null;
  }

  const sessionEnd =
    leftAt > attendance.event.endAt ? attendance.event.endAt : leftAt;
  const elapsedSeconds = getElapsedSeconds(attendance.lastJoinedAt, sessionEnd);
  const totalSecondsInVoice = attendance.totalSecondsInVoice + elapsedSeconds;
  const shouldQualify = totalSecondsInVoice >= minSeconds;

  return prisma.eventAttendance.update({
    where: { id: attendance.id },
    data: {
      currentVoiceChannelId: null,
      lastJoinedAt: null,
      lastLeftAt: leftAt,
      totalSecondsInVoice,
      qualifiedAt: attendance.qualifiedAt ?? (shouldQualify ? sessionEnd : null),
      status: shouldQualify
        ? EventAttendanceStatus.PRESENT
        : EventAttendanceStatus.LEFT,
    },
    include: {
      event: true,
    },
  });
}

export async function refreshActiveEventAttendances(now = new Date()) {
  const minSeconds = await getConfiguredAttendanceSeconds();
  const activeAttendances = await prisma.eventAttendance.findMany({
    where: {
      lastJoinedAt: { not: null },
    },
    include: {
      event: true,
    },
  });

  let promoted = 0;
  let finalized = 0;

  for (const attendance of activeAttendances) {
    if (!attendance.lastJoinedAt) continue;

    const effectiveNow = now > attendance.event.endAt ? attendance.event.endAt : now;
    const totalSecondsInVoice =
      attendance.totalSecondsInVoice +
      getElapsedSeconds(attendance.lastJoinedAt, effectiveNow);
    const shouldQualify = totalSecondsInVoice >= minSeconds;
    const eventEnded = now >= attendance.event.endAt;

    if (!shouldQualify && !eventEnded) {
      continue;
    }

    await prisma.eventAttendance.update({
      where: { id: attendance.id },
      data: {
        qualifiedAt: attendance.qualifiedAt ?? (shouldQualify ? effectiveNow : null),
        status: shouldQualify
          ? EventAttendanceStatus.PRESENT
          : EventAttendanceStatus.LEFT,
        ...(eventEnded
          ? {
              currentVoiceChannelId: null,
              lastJoinedAt: null,
              lastLeftAt: attendance.event.endAt,
              totalSecondsInVoice,
            }
          : {}),
      },
    });

    if (shouldQualify && !attendance.qualifiedAt) {
      promoted += 1;
    }

    if (eventEnded) {
      finalized += 1;
    }
  }

  return {
    scanned: activeAttendances.length,
    promoted,
    finalized,
  };
}

export async function confirmAttendanceFromDiscord(input: {
  attendanceId: string;
  discordId: string;
  proofNote?: string | null;
  confirmedAt?: Date;
}) {
  const confirmedAt = input.confirmedAt ?? new Date();
  const attendance = await prisma.eventAttendance.findUnique({
    where: { id: input.attendanceId },
    include: { event: true },
  });

  if (!attendance || attendance.discordId !== input.discordId) {
    return null;
  }

  const minSeconds = await getConfiguredAttendanceSeconds();
  const effectiveNow =
    confirmedAt > attendance.event.endAt ? attendance.event.endAt : confirmedAt;
  const runningSeconds = attendance.lastJoinedAt
    ? getElapsedSeconds(attendance.lastJoinedAt, effectiveNow)
    : 0;
  const totalSecondsInVoice = attendance.totalSecondsInVoice + runningSeconds;
  const shouldQualify = totalSecondsInVoice >= minSeconds;
  const proofNote = input.proofNote?.trim() || null;

  const updated = await prisma.eventAttendance.update({
    where: { id: attendance.id },
    data: {
      confirmedAt,
      proofNote,
      proofSubmittedAt: proofNote ? confirmedAt : attendance.proofSubmittedAt,
      qualifiedAt: attendance.qualifiedAt ?? (shouldQualify ? effectiveNow : null),
      status: shouldQualify
        ? EventAttendanceStatus.PRESENT
        : attendance.lastJoinedAt
          ? EventAttendanceStatus.IN_VOICE
          : EventAttendanceStatus.LEFT,
    },
    include: { event: true },
  });

  return {
    attendance: updated,
    minSeconds,
    totalSecondsInVoice,
    qualified: Boolean(updated.qualifiedAt),
  };
}

export async function markAttendanceDmSent(attendanceId: string, sentAt = new Date()) {
  return prisma.eventAttendance.update({
    where: { id: attendanceId },
    data: {
      dmSentAt: sentAt,
    },
  });
}
