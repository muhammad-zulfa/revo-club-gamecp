import { ApprovalStatus } from "@prisma/client";
import {
  createAttendanceModalCustomId,
  createDiscordApprovalUpdateResponse,
  createDiscordEphemeralResponse,
  createDiscordInteractionMessageResponse,
  createDiscordModalResponse,
  createDiscordPingResponse,
  getDiscordModalValue,
  getDiscordReviewerName,
  isDiscordApproverAuthorized,
  isMessageComponentInteraction,
  isModalSubmitInteraction,
  isPingInteraction,
  moveDiscordMemberToVoiceChannel,
  parseAttendanceConfirmCustomId,
  parseAttendanceModalCustomId,
  parseAttendanceNoteCustomId,
  parseEventJoinCustomId,
  parseApprovalCustomId,
  verifyDiscordRequest
} from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { setUserApprovalStatus } from "@/lib/approvals";
import { confirmAttendanceFromDiscord, getConfiguredAttendanceMinutes } from "@/lib/event-attendance";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const isVerified = await verifyDiscordRequest(rawBody, signature, timestamp);

  if (!isVerified) {
    return new Response("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as import("@/lib/discord").DiscordInteraction;

  if (isPingInteraction(interaction)) {
    return createDiscordPingResponse();
  }

  if (isModalSubmitInteraction(interaction)) {
    const attendanceModal = parseAttendanceModalCustomId(interaction.data?.custom_id);
    const userId = interaction.member?.user?.id ?? interaction.user?.id;

    if (!attendanceModal || !userId) {
      return createDiscordEphemeralResponse("Unknown attendance submission.");
    }

    const proofNote = getDiscordModalValue(interaction, "proofNote");
    const confirmed = await confirmAttendanceFromDiscord({
      attendanceId: attendanceModal.attendanceId,
      discordId: userId,
      proofNote,
    });

    if (!confirmed) {
      return createDiscordEphemeralResponse("That attendance check-in is no longer available.");
    }

    if (confirmed.qualified) {
      return createDiscordInteractionMessageResponse("You are marked present for this event. Your note was saved.");
    }

    const minutesRequired = Math.ceil(confirmed.minSeconds / 60);
    return createDiscordInteractionMessageResponse(`Your note was saved. Stay in voice for at least ${minutesRequired} minute${minutesRequired === 1 ? "" : "s"} total to be auto-marked present.`);
  }

  if (!isMessageComponentInteraction(interaction)) {
    return createDiscordEphemeralResponse("Unsupported Discord interaction.");
  }

  const attendanceConfirm = parseAttendanceConfirmCustomId(interaction.data?.custom_id);

  if (attendanceConfirm) {
    const userId = interaction.member?.user?.id ?? interaction.user?.id;

    if (!userId) {
      return createDiscordEphemeralResponse("Discord user not found for this interaction.");
    }

    const confirmed = await confirmAttendanceFromDiscord({
      attendanceId: attendanceConfirm.attendanceId,
      discordId: userId,
    });

    if (!confirmed) {
      return createDiscordEphemeralResponse("That attendance check-in is no longer available.");
    }

    if (confirmed.qualified) {
      return createDiscordInteractionMessageResponse("You are marked present for this event.");
    }

    const minutesRequired = Math.ceil(confirmed.minSeconds / 60);
    return createDiscordInteractionMessageResponse(`Confirmation saved. Stay in voice for at least ${minutesRequired} minute${minutesRequired === 1 ? "" : "s"} total to be auto-marked present.`);
  }

  const attendanceNote = parseAttendanceNoteCustomId(interaction.data?.custom_id);

  if (attendanceNote) {
    const minutesRequired = await getConfiguredAttendanceMinutes();
    return createDiscordModalResponse({
      customId: createAttendanceModalCustomId(attendanceNote.attendanceId),
      title: "Attendance note",
      label: "Optional proof note",
      placeholder: `Example: joined at call start, stayed ${minutesRequired}+ minutes, handled north lane.`,
    });
  }

  const eventJoin = parseEventJoinCustomId(interaction.data?.custom_id);

  if (eventJoin) {
    const userId = interaction.member?.user?.id ?? interaction.user?.id;

    if (!userId) {
      return createDiscordEphemeralResponse("Discord user not found for this interaction.");
    }

    const event = await prisma.event.findUnique({
      where: { id: eventJoin.eventId },
      select: {
        title: true,
        endAt: true,
        discordVoiceChannelId: true,
      },
    });

    if (!event) {
      return createDiscordEphemeralResponse("This event no longer exists.");
    }

    if (!event.discordVoiceChannelId) {
      return createDiscordEphemeralResponse("No voice channel is configured for this event.");
    }

    if (event.endAt <= new Date()) {
      return createDiscordEphemeralResponse("This event has already ended, so voice join is no longer available.");
    }

    try {
      await moveDiscordMemberToVoiceChannel(userId, event.discordVoiceChannelId);
      return createDiscordInteractionMessageResponse(`Moved you to the configured voice channel for **${event.title}**.`);
    } catch (error) {
      console.error("Discord voice move failed:", error);
      return createDiscordEphemeralResponse("Could not move you into that voice channel. Make sure you are already connected to voice and the bot has Move Members permission.");
    }
  }

  if (!(await isDiscordApproverAuthorized(interaction))) {
    return createDiscordEphemeralResponse("You are not allowed to review registrations from Discord.");
  }

  const approval = parseApprovalCustomId(interaction.data?.custom_id);

  if (!approval) {
    return createDiscordEphemeralResponse("Unknown action.");
  }

  const status = approval.action === "approve" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
  const reviewerName = getDiscordReviewerName(interaction);
  const user = await prisma.user.findUnique({ where: { id: approval.userId } });

  if (!user) {
    return createDiscordEphemeralResponse("This registration no longer exists.");
  }

  const updatedUser = await setUserApprovalStatus(user.id, status, reviewerName);
  return createDiscordApprovalUpdateResponse(updatedUser, status, reviewerName);
}
