import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendDiscordEventReminder } from "@/lib/discord";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      startAt: true,
      endAt: true,
      discordVoiceChannelId: true,
    },
  });

  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  try {
    const sent = await sendDiscordEventReminder(event);

    if (!sent) {
      return NextResponse.json({
        message: "Reminder skipped because the event channel or bot is not configured.",
      });
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { discordReminderSentAt: new Date() },
    });

    return NextResponse.json({ message: "Reminder sent to Discord." });
  } catch (error) {
    console.error("Manual Discord reminder failed:", {
      eventId: event.id,
      error,
    });

    return NextResponse.json(
      { message: "Discord reminder failed. Check bot access and channel settings." },
      { status: 500 },
    );
  }
}
