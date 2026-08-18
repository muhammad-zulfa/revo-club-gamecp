import { prisma } from "@/lib/prisma";

export type DiscordSettings = {
  appBaseUrl: string;
  discordServerName: string;
  discordInviteUrl: string;
  discordRegistrationLabel: string;
  discordRegistrationChannelId: string;
  discordEventChannelId: string;
  discordGuildTradeChannelId: string;
  discordPitBossChannelId: string;
  discordChipWarChannelId: string;
  discordGvgChannelId: string;
  discordOtherChannelId: string;
  discordMemberRoleId: string;
  discordEventReminderOffsets: string;
  discordEventAttendanceMinutes: string;
  discordApprovalWebhookUrl: string;
  discordInteractionsPublicKey: string;
  discordAdminRoleId: string;
  discordAdminUserIds: string;
  discordBotToken: string;
  discordOAuthClientId: string;
  discordOAuthClientSecret: string;
  discordGuildId: string;
  warehouseMemberSaleFeePercent: number;
};

const defaultSettings: DiscordSettings = {
  appBaseUrl: "",
  discordServerName: "",
  discordInviteUrl: "",
  discordRegistrationLabel: "Registration",
  discordRegistrationChannelId: "",
  discordEventChannelId: "",
  discordGuildTradeChannelId: "",
  discordPitBossChannelId: "",
  discordChipWarChannelId: "",
  discordGvgChannelId: "",
  discordOtherChannelId: "",
  discordMemberRoleId: "",
  discordEventReminderOffsets: "60,15,0",
  discordEventAttendanceMinutes: "10",
  discordApprovalWebhookUrl: "",
  discordInteractionsPublicKey: "",
  discordAdminRoleId: "",
  discordAdminUserIds: "",
  discordBotToken: "",
  discordOAuthClientId: "",
  discordOAuthClientSecret: "",
  discordGuildId: "",
  warehouseMemberSaleFeePercent: 0,
};

export async function getDiscordSettings(): Promise<DiscordSettings> {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: "default" } });

    return {
      appBaseUrl: config?.appBaseUrl ?? process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "",
      discordServerName: config?.discordServerName ?? process.env.DISCORD_SERVER_NAME ?? "",
      discordInviteUrl: config?.discordInviteUrl ?? process.env.DISCORD_INVITE_URL ?? "",
      discordRegistrationLabel: config?.discordRegistrationLabel ?? process.env.DISCORD_REGISTRATION_LABEL ?? "Registration",
      discordRegistrationChannelId: config?.discordRegistrationChannelId ?? process.env.DISCORD_REGISTRATION_CHANNEL_ID ?? "",
      discordEventChannelId: config?.discordEventChannelId ?? process.env.DISCORD_EVENT_CHANNEL_ID ?? "",
      discordGuildTradeChannelId: config?.discordGuildTradeChannelId ?? process.env.DISCORD_GUILD_TRADE_CHANNEL_ID ?? "",
      discordPitBossChannelId: config?.discordPitBossChannelId ?? process.env.DISCORD_PIT_BOSS_CHANNEL_ID ?? "",
      discordChipWarChannelId: config?.discordChipWarChannelId ?? process.env.DISCORD_CHIP_WAR_CHANNEL_ID ?? "",
      discordGvgChannelId: config?.discordGvgChannelId ?? process.env.DISCORD_GVG_CHANNEL_ID ?? "",
      discordOtherChannelId: config?.discordOtherChannelId ?? process.env.DISCORD_OTHER_CHANNEL_ID ?? "",
      discordMemberRoleId: config?.discordMemberRoleId ?? process.env.DISCORD_MEMBER_ROLE_ID ?? "",
      discordEventReminderOffsets: config?.discordEventReminderOffsets ?? process.env.DISCORD_EVENT_REMINDER_OFFSETS ?? "60,15,0",
      discordEventAttendanceMinutes: config?.discordEventAttendanceMinutes ?? process.env.DISCORD_EVENT_ATTENDANCE_MINUTES ?? "10",
      discordApprovalWebhookUrl: config?.discordApprovalWebhookUrl ?? process.env.DISCORD_APPROVAL_WEBHOOK_URL ?? "",
      discordInteractionsPublicKey: config?.discordInteractionsPublicKey ?? process.env.DISCORD_INTERACTIONS_PUBLIC_KEY ?? "",
      discordAdminRoleId: config?.discordAdminRoleId ?? process.env.DISCORD_ADMIN_ROLE_ID ?? "",
      discordAdminUserIds: config?.discordAdminUserIds ?? process.env.DISCORD_ADMIN_USER_IDS ?? "",
      discordBotToken: config?.discordBotToken ?? process.env.DISCORD_BOT_TOKEN ?? "",
      discordOAuthClientId: config?.discordOAuthClientId ?? process.env.DISCORD_OAUTH_CLIENT_ID ?? "",
      discordOAuthClientSecret: config?.discordOAuthClientSecret ?? process.env.DISCORD_OAUTH_CLIENT_SECRET ?? "",
      discordGuildId: config?.discordGuildId ?? process.env.DISCORD_GUILD_ID ?? "",
      warehouseMemberSaleFeePercent: Number(
        config?.warehouseMemberSaleFeePercent
          ?? process.env.WAREHOUSE_MEMBER_SALE_FEE_PERCENT
          ?? 0,
      ),
    };
  } catch {
    return {
      ...defaultSettings,
      appBaseUrl: process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "",
      discordServerName: process.env.DISCORD_SERVER_NAME ?? "",
      discordInviteUrl: process.env.DISCORD_INVITE_URL ?? "",
      discordRegistrationLabel: process.env.DISCORD_REGISTRATION_LABEL ?? "Registration",
      discordRegistrationChannelId: process.env.DISCORD_REGISTRATION_CHANNEL_ID ?? "",
      discordEventChannelId: process.env.DISCORD_EVENT_CHANNEL_ID ?? "",
      discordGuildTradeChannelId: process.env.DISCORD_GUILD_TRADE_CHANNEL_ID ?? "",
      discordPitBossChannelId: process.env.DISCORD_PIT_BOSS_CHANNEL_ID ?? "",
      discordChipWarChannelId: process.env.DISCORD_CHIP_WAR_CHANNEL_ID ?? "",
      discordGvgChannelId: process.env.DISCORD_GVG_CHANNEL_ID ?? "",
      discordOtherChannelId: process.env.DISCORD_OTHER_CHANNEL_ID ?? "",
      discordMemberRoleId: process.env.DISCORD_MEMBER_ROLE_ID ?? "",
      discordEventReminderOffsets: process.env.DISCORD_EVENT_REMINDER_OFFSETS ?? "60,15,0",
      discordEventAttendanceMinutes: process.env.DISCORD_EVENT_ATTENDANCE_MINUTES ?? "10",
      discordApprovalWebhookUrl: process.env.DISCORD_APPROVAL_WEBHOOK_URL ?? "",
      discordInteractionsPublicKey: process.env.DISCORD_INTERACTIONS_PUBLIC_KEY ?? "",
      discordAdminRoleId: process.env.DISCORD_ADMIN_ROLE_ID ?? "",
      discordAdminUserIds: process.env.DISCORD_ADMIN_USER_IDS ?? "",
      discordBotToken: process.env.DISCORD_BOT_TOKEN ?? "",
      discordOAuthClientId: process.env.DISCORD_OAUTH_CLIENT_ID ?? "",
      discordOAuthClientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET ?? "",
      discordGuildId: process.env.DISCORD_GUILD_ID ?? "",
      warehouseMemberSaleFeePercent: Number(
        process.env.WAREHOUSE_MEMBER_SALE_FEE_PERCENT ?? 0,
      ),
    };
  }
}

export async function saveDiscordSettings(input: Partial<DiscordSettings>) {
  return prisma.appConfig.upsert({
    where: { id: "default" },
    update: input,
    create: {
      id: "default",
      ...defaultSettings,
      ...input
    }
  });
}
