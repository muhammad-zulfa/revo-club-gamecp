import { ApprovalStatus, CurrencyUnit, GpLedgerEntryType, UserRole } from "@prisma/client";
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
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
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

      const participants = await tx.user.findMany({
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

      await Promise.all([
        tx.event.update({
          where: { id: event.id },
          data: {
            bonusDistributedAt: new Date(),
            bonusParticipantCount: participantCount,
            bonusTotalGp: totalGp,
            bonusGuildShareGp: guildShareGp,
            bonusPerParticipantGp: perParticipantGp,
          },
        }),
        tx.appConfig.upsert({
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
      ]);

      await Promise.all(
        approvedParticipantIds.map((participantId) =>
          tx.user.update({
            where: { id: participantId },
            data: {
              gpBalance: {
                increment: perParticipantGp,
              },
            },
          }),
        ),
      );

      const participantByDiscordId = new Map(
        participants
          .filter((participant) => participant.discordId)
          .map((participant) => [participant.discordId as string, participant.id]),
      );

      await Promise.all(
        eligibleAttendances
          .filter((attendance) => !attendance.userId)
          .map((attendance) => {
            const linkedUserId = participantByDiscordId.get(attendance.discordId);
            if (!linkedUserId) return null;

            return tx.eventAttendance.updateMany({
              where: {
                eventId: event.id,
                discordId: attendance.discordId,
                userId: null,
              },
              data: {
                userId: linkedUserId,
              },
            });
          })
          .filter(Boolean),
      );

      await tx.gpLedgerEntry.createMany({
        data: approvedParticipantIds.map((participantId) => ({
          userId: participantId,
          eventId: event.id,
          type: GpLedgerEntryType.EVENT_BONUS,
          amount: perParticipantGp,
          note: `Pit Boss bonus from ${event.title}`,
        })),
      });

      await tx.activityLog.create({
        data: {
          type: "event.bonus_distributed",
          title: `Pit Boss bonus distributed for ${event.title}`,
          detail: `${participantCount} participant${participantCount === 1 ? "" : "s"} received ${perParticipantGp.toFixed(2)} GP each. Guild share: ${guildShareGp.toFixed(2)} GP.`,
        },
      }).catch(() => null);

      return {
        participantCount,
        perParticipantGp,
        guildShareGp,
      };
    });

    return NextResponse.json({
      message: `Bonus distributed to ${result.participantCount} participant${result.participantCount === 1 ? "" : "s"} at ${result.perParticipantGp.toFixed(2)} GP each. Guild received ${result.guildShareGp.toFixed(2)} GP.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pit Boss bonus could not be distributed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
