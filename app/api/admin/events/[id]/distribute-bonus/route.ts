import { ApprovalStatus, CurrencyUnit, GpLedgerEntryType, Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        warehouseItems: {
          select: {
            id: true,
            askingPrice: true,
            askingPriceCurrency: true,
          },
        },
        attendees: {
          select: {
            userId: true,
            discordId: true,
            qualifiedAt: true,
            confirmedAt: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error("Event not found.");
    }

    if (event.bonusDistributedAt) {
      throw new Error("Pit Boss bonus has already been distributed for this event.");
    }

    const totalGp = event.warehouseItems
      .filter((item) => item.askingPriceCurrency === CurrencyUnit.GP)
      .reduce((sum, item) => sum + item.askingPrice, 0);

    if (totalGp <= 0) {
      throw new Error("No linked warehouse item GP value is available for this event.");
    }

    const eligibleAttendances = event.attendees.filter(
      (attendee) => attendee.qualifiedAt || attendee.confirmedAt,
    );

    if (!eligibleAttendances.length) {
      throw new Error("No eligible participants were found. Only present or manually confirmed members can receive the bonus.");
    }

    const participants = await prisma.user.findMany({
      where: {
        role: UserRole.MEMBER,
        approvalStatus: ApprovalStatus.APPROVED,
        OR: [
          {
            id: {
              in: eligibleAttendances
                .map((attendee) => attendee.userId)
                .filter((value): value is string => Boolean(value)),
            },
          },
          {
            discordId: {
              in: eligibleAttendances.map((attendee) => attendee.discordId),
            },
          },
        ],
      },
      select: {
        id: true,
        discordId: true,
      },
    });

    if (!participants.length) {
      throw new Error("No approved member accounts were found for eligible participants.");
    }

    const approvedParticipantIds = participants.map((participant) => participant.id);
    const participantCount = approvedParticipantIds.length;
    const participantPool = totalGp * 0.8;
    const guildShareGp = totalGp - participantPool;
    const perParticipantGp = participantPool / participantCount;
    const distributedAt = new Date();

    const participantByDiscordId = new Map(
      participants
        .filter((participant) => participant.discordId)
        .map((participant) => [participant.discordId as string, participant.id]),
    );

    const attendanceLinkOps: Prisma.PrismaPromise<unknown>[] = [];

    for (const attendance of eligibleAttendances.filter((entry) => !entry.userId)) {
        const linkedUserId = participantByDiscordId.get(attendance.discordId);
        if (!linkedUserId) continue;

        attendanceLinkOps.push(prisma.eventAttendance.updateMany({
          where: {
            eventId: event.id,
            discordId: attendance.discordId,
            userId: null,
          },
          data: {
            userId: linkedUserId,
          },
        }));
    }

    const guardedEventUpdate = prisma.event.updateMany({
      where: {
        id: event.id,
        bonusDistributedAt: null,
      },
      data: {
        bonusDistributedAt: distributedAt,
        bonusParticipantCount: participantCount,
        bonusTotalGp: totalGp,
        bonusGuildShareGp: guildShareGp,
        bonusPerParticipantGp: perParticipantGp,
      },
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [
      guardedEventUpdate,
      prisma.appConfig.upsert({
        where: { id: "default" },
        update: {
          guildGpBalance: {
            increment: guildShareGp,
          },
        },
        create: {
          id: "default",
          guildGpBalance: guildShareGp,
        },
      }),
      ...approvedParticipantIds.map((participantId) =>
        prisma.user.update({
          where: { id: participantId },
          data: {
            gpBalance: {
              increment: perParticipantGp,
            },
          },
        }),
      ),
      ...attendanceLinkOps,
      prisma.gpLedgerEntry.createMany({
        data: approvedParticipantIds.map((participantId) => ({
          userId: participantId,
          eventId: event.id,
          type: GpLedgerEntryType.EVENT_BONUS,
          amount: perParticipantGp,
          note: `Pit Boss bonus from ${event.title}`,
        })),
      }),
      prisma.activityLog.create({
        data: {
          type: "event.bonus_distributed",
          title: `Pit Boss bonus distributed for ${event.title}`,
          detail: `${participantCount} participant${participantCount === 1 ? "" : "s"} received ${perParticipantGp.toFixed(2)} GP each. Guild share: ${guildShareGp.toFixed(2)} GP.`,
        },
      }),
    ];

    const result = await prisma.$transaction(operations);
    const eventUpdateResult = result[0] as { count: number };

    if (eventUpdateResult.count !== 1) {
      throw new Error("Pit Boss bonus has already been distributed for this event.");
    }

    return NextResponse.json({
      message: `Bonus distributed to ${participantCount} participant${participantCount === 1 ? "" : "s"} at ${perParticipantGp.toFixed(2)} GP each. Guild received ${guildShareGp.toFixed(2)} GP.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pit Boss bonus could not be distributed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
