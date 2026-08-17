import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveDiscordSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();

  await saveDiscordSettings({
    appBaseUrl: String(form.get("appBaseUrl") ?? "").trim(),
    discordServerName: String(form.get("discordServerName") ?? "").trim(),
    discordInviteUrl: String(form.get("discordInviteUrl") ?? "").trim(),
    discordRegistrationLabel: String(form.get("discordRegistrationLabel") ?? "").trim(),
    discordRegistrationChannelId: String(form.get("discordRegistrationChannelId") ?? "").trim(),
    discordEventChannelId: String(form.get("discordEventChannelId") ?? "").trim(),
    discordGuildTradeChannelId: String(form.get("discordGuildTradeChannelId") ?? "").trim(),
    discordPitBossChannelId: String(form.get("discordPitBossChannelId") ?? "").trim(),
    discordChipWarChannelId: String(form.get("discordChipWarChannelId") ?? "").trim(),
    discordGvgChannelId: String(form.get("discordGvgChannelId") ?? "").trim(),
    discordOtherChannelId: String(form.get("discordOtherChannelId") ?? "").trim(),
    discordMemberRoleId: String(form.get("discordMemberRoleId") ?? "").trim(),
    discordEventReminderOffsets: String(form.get("discordEventReminderOffsets") ?? "").trim(),
    discordEventAttendanceMinutes: String(form.get("discordEventAttendanceMinutes") ?? "").trim(),
    discordApprovalWebhookUrl: String(form.get("discordApprovalWebhookUrl") ?? "").trim(),
    discordInteractionsPublicKey: String(form.get("discordInteractionsPublicKey") ?? "").trim(),
    discordAdminRoleId: String(form.get("discordAdminRoleId") ?? "").trim(),
    discordAdminUserIds: String(form.get("discordAdminUserIds") ?? "").trim(),
    discordBotToken: String(form.get("discordBotToken") ?? "").trim(),
    discordOAuthClientId: String(form.get("discordOAuthClientId") ?? "").trim(),
    discordOAuthClientSecret: String(form.get("discordOAuthClientSecret") ?? "").trim(),
    discordGuildId: String(form.get("discordGuildId") ?? "").trim()
  });

  return NextResponse.redirect(new URL("/settings?saved=1", req.url), 303);
}
