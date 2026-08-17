import { ApprovalStatus, EventCategory } from "@prisma/client";
import nacl from "tweetnacl";
import { getDiscordSettings } from "@/lib/settings";

const DISCORD_PING = 1;
const DISCORD_MESSAGE_COMPONENT = 3;
const DISCORD_MODAL_SUBMIT = 5;
const DISCORD_PONG = 1;
const DISCORD_CHANNEL_MESSAGE_WITH_SOURCE = 4;
const DISCORD_UPDATE_MESSAGE = 7;
const DISCORD_MODAL = 9;
const DISCORD_EPHEMERAL_FLAG = 64;

type DiscordUser = {
  id: string;
  username?: string;
  global_name?: string | null;
};

type DiscordMember = {
  roles?: string[];
  user?: DiscordUser;
};

export type DiscordInteraction = {
  type: number;
  data?: {
    custom_id?: string;
    components?: Array<{
      components?: Array<{
        custom_id?: string;
        value?: string;
      }>;
    }>;
  };
  member?: DiscordMember;
  user?: DiscordUser;
};

export async function getDiscordConfig() {
  const settings = await getDiscordSettings();

  return {
    serverName: settings.discordServerName,
    inviteUrl: settings.discordInviteUrl,
    registrationLabel: settings.discordRegistrationLabel,
    registrationChannelId: settings.discordRegistrationChannelId,
    eventChannelId: settings.discordEventChannelId,
    guildTradeChannelId: settings.discordGuildTradeChannelId,
    pitBossChannelId: settings.discordPitBossChannelId,
    chipWarChannelId: settings.discordChipWarChannelId,
    gvgChannelId: settings.discordGvgChannelId,
    otherChannelId: settings.discordOtherChannelId,
    memberRoleId: settings.discordMemberRoleId,
    webhookUrl: settings.discordApprovalWebhookUrl,
    publicKey: settings.discordInteractionsPublicKey,
    adminRoleId: settings.discordAdminRoleId,
    botToken: settings.discordBotToken,
    guildId: settings.discordGuildId,
    adminUserIds: settings.discordAdminUserIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  };
}

function getDiscordEventChannelIdByCategory(
  category: EventCategory,
  config: Awaited<ReturnType<typeof getDiscordConfig>>
) {
  if (category === EventCategory.PIT_BOSS) {
    return config.pitBossChannelId || config.eventChannelId;
  }

  if (category === EventCategory.CHIP_WAR) {
    return config.chipWarChannelId || config.eventChannelId;
  }

  if (category === EventCategory.GVG) {
    return config.gvgChannelId || config.eventChannelId;
  }

  return config.otherChannelId || config.eventChannelId;
}

export function createApprovalCustomId(action: "approve" | "reject", userId: string) {
  return `registration:${action}:${userId}`;
}

export function parseApprovalCustomId(customId?: string) {
  if (!customId) return null;
  const [scope, action, userId] = customId.split(":");
  if (scope !== "registration" || !userId || (action !== "approve" && action !== "reject")) return null;
  return { action, userId };
}

export function createEventJoinCustomId(eventId: string) {
  return `event:join:${eventId}`;
}

export function parseEventJoinCustomId(customId?: string) {
  if (!customId) return null;
  const [scope, action, eventId] = customId.split(":");
  if (scope !== "event" || action !== "join" || !eventId) return null;
  return { eventId };
}

export function createAttendanceConfirmCustomId(attendanceId: string) {
  return `attendance:confirm:${attendanceId}`;
}

export function createAttendanceNoteCustomId(attendanceId: string) {
  return `attendance:note:${attendanceId}`;
}

export function createAttendanceModalCustomId(attendanceId: string) {
  return `attendance:modal:${attendanceId}`;
}

export function parseAttendanceConfirmCustomId(customId?: string) {
  if (!customId) return null;
  const [scope, action, attendanceId] = customId.split(":");
  if (scope !== "attendance" || action !== "confirm" || !attendanceId) return null;
  return { attendanceId };
}

export function parseAttendanceNoteCustomId(customId?: string) {
  if (!customId) return null;
  const [scope, action, attendanceId] = customId.split(":");
  if (scope !== "attendance" || action !== "note" || !attendanceId) return null;
  return { attendanceId };
}

export function parseAttendanceModalCustomId(customId?: string) {
  if (!customId) return null;
  const [scope, action, attendanceId] = customId.split(":");
  if (scope !== "attendance" || action !== "modal" || !attendanceId) return null;
  return { attendanceId };
}

export function getDiscordModalValue(
  interaction: DiscordInteraction,
  customId: string,
) {
  for (const row of interaction.data?.components ?? []) {
    for (const component of row.components ?? []) {
      if (component.custom_id === customId) {
        return component.value ?? "";
      }
    }
  }

  return "";
}

export function getDiscordReviewerName(interaction: DiscordInteraction) {
  const user = interaction.member?.user ?? interaction.user;
  return user?.global_name || user?.username || user?.id || "Discord admin";
}

export async function isDiscordApproverAuthorized(interaction: DiscordInteraction) {
  const { adminRoleId, adminUserIds } = await getDiscordConfig();
  const userId = interaction.member?.user?.id ?? interaction.user?.id;
  const roles = interaction.member?.roles ?? [];

  if (userId && adminUserIds.includes(userId)) return true;
  if (adminRoleId && roles.includes(adminRoleId)) return true;

  return false;
}

export async function verifyDiscordRequest(rawBody: string, signature?: string | null, timestamp?: string | null) {
  const { publicKey } = await getDiscordConfig();

  if (!publicKey || !signature || !timestamp) return false;

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex")
  );
}

export async function createDiscordNotificationPayload(
  user: { id: string; name: string; email: string; discordHandle: string; discordId?: string | null },
  includeComponents = true,
) {
  const { adminRoleId, adminUserIds, registrationLabel } = await getDiscordConfig();
  const mention = adminRoleId
    ? `<@&${adminRoleId}>`
    : adminUserIds[0]
      ? adminUserIds.map((userId) => `<@${userId}>`).join(" ")
      : "@here";
  const applicantMention = user.discordId ? `<@${user.discordId}>` : user.discordHandle;
  const allowedUsers = user.discordId ? [...new Set([...adminUserIds, user.discordId])] : adminUserIds;

  return {
    content: `${applicantMention} is awaiting approval in #${registrationLabel || "registration"}. ${mention}`,
    allowed_mentions: {
      parse: [],
      roles: adminRoleId ? [adminRoleId] : [],
      users: allowedUsers
    },
    embeds: [
      {
        title: "New registration request",
        color: 2322672,
        fields: [
          { name: "Applicant", value: user.name, inline: true },
          { name: "Email", value: user.email, inline: true },
          { name: "Discord", value: user.discordHandle, inline: true },
          { name: "Review rule", value: "Verify Discord server membership before approval.", inline: false }
        ]
      }
    ],
    ...(includeComponents ? {
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "Approve",
              custom_id: createApprovalCustomId("approve", user.id)
            },
            {
              type: 2,
              style: 4,
              label: "Reject",
              custom_id: createApprovalCustomId("reject", user.id)
            }
          ]
        }
      ]
    } : {})
  };
}

function getEventCategoryLabel(category: EventCategory) {
  if (category === EventCategory.PIT_BOSS) return "Pit Boss";
  if (category === EventCategory.CHIP_WAR) return "Chip War";
  if (category === EventCategory.GVG) return "GvG";
  return "Other";
}

function formatDiscordEventDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDiscordEventTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function canUseEventJoinAction(endAt: Date, now = new Date()) {
  return endAt.getTime() > now.getTime();
}

export async function createDiscordEventReminderPayload(event: {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  startAt: Date;
  endAt: Date;
  discordVoiceChannelId?: string | null;
  timingLabel?: string;
}) {
  const { memberRoleId } = await getDiscordConfig();
  const roleMention = memberRoleId ? `<@&${memberRoleId}>` : "";
  const startLabel = formatDiscordEventTime(event.startAt);
  const endLabel = formatDiscordEventTime(event.endAt);
  const timingLabel = event.timingLabel ?? `starts at ${startLabel}`;
  const joinActive = Boolean(
    event.discordVoiceChannelId && canUseEventJoinAction(event.endAt),
  );

  return {
    content: `${roleMention ? `${roleMention} ` : ""}Event reminder: **${event.title}** ${timingLabel}.`,
    allowed_mentions: {
      parse: [],
      roles: memberRoleId ? [memberRoleId] : [],
      users: [],
    },
    embeds: [
      {
        title: event.title,
        color: 2322672,
        fields: [
          { name: "Category", value: getEventCategoryLabel(event.category), inline: true },
          { name: "Date", value: formatDiscordEventDate(event.startAt), inline: true },
          { name: "Time", value: `${startLabel} - ${endLabel}`, inline: true },
          ...(event.description
            ? [{ name: "Details", value: event.description, inline: false }]
            : []),
        ],
      },
    ],
    components: event.discordVoiceChannelId
      ? [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 1,
                label: joinActive ? "Join voice" : "Event ended",
                custom_id: createEventJoinCustomId(event.id),
                disabled: !joinActive,
              },
            ],
          },
        ]
      : [],
  };
}

function createDiscordAttendancePayload(input: {
  attendanceId: string;
  eventTitle: string;
  startAt: Date;
  endAt: Date;
  attendanceMinutes: number;
}) {
  const startLabel = formatDiscordEventTime(input.startAt);
  const endLabel = formatDiscordEventTime(input.endAt);

  return {
    content: `Attendance check-in for **${input.eventTitle}**.`,
    embeds: [
      {
        title: input.eventTitle,
        color: 2322672,
        fields: [
          { name: "Time", value: `${startLabel} - ${endLabel}`, inline: true },
          {
            name: "Presence rule",
            value: `Stay in the event voice channel for at least ${input.attendanceMinutes} minute${input.attendanceMinutes === 1 ? "" : "s"} to be auto-marked present.`,
            inline: false,
          },
          {
            name: "Optional confirmation",
            value: "Use the buttons below to confirm you joined and attach an optional note for the admin team.",
            inline: false,
          },
        ],
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Confirm presence",
            custom_id: createAttendanceConfirmCustomId(input.attendanceId),
          },
          {
            type: 2,
            style: 2,
            label: "Add note",
            custom_id: createAttendanceNoteCustomId(input.attendanceId),
          },
        ],
      },
    ],
  };
}

export async function sendDiscordRegistrationNotification(
  user: { id: string; name: string; email: string; discordHandle: string; discordId?: string | null },
) {
  const { webhookUrl, botToken, registrationChannelId } = await getDiscordConfig();

  if (botToken && registrationChannelId) {
    const response = await fetch(`https://discord.com/api/channels/${registrationChannelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify(await createDiscordNotificationPayload(user, true)),
    });

    if (response.ok) {
      return;
    }

    const errorText = await response.text();
    throw new Error(`Discord bot message failed (${response.status}): ${errorText}`);
  }

  if (!webhookUrl) return;

  const url = new URL(webhookUrl);
  url.searchParams.set("wait", "true");
  url.searchParams.set("with_components", "true");

  const withComponentsPayload = await createDiscordNotificationPayload(user, true);
  let response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withComponentsPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Standard Discord channel webhooks reject interactive components.
    if (response.status === 400 && errorText.includes("\"components\"")) {
      url.searchParams.delete("with_components");
      const fallbackPayload = await createDiscordNotificationPayload(user, false);
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackPayload)
      });

      if (response.ok) {
        return;
      }

      throw new Error(`Discord webhook fallback failed (${response.status})`);
    }

    throw new Error(`Discord webhook failed (${response.status}): ${errorText}`);
  }
}

export async function sendDiscordEventReminder(event: {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  startAt: Date;
  endAt: Date;
  discordVoiceChannelId?: string | null;
  timingLabel?: string;
}) {
  const config = await getDiscordConfig();
  const { botToken } = config;
  const eventChannelId = getDiscordEventChannelIdByCategory(event.category, config);

  if (!botToken || !eventChannelId) {
    return false;
  }

  const response = await fetch(`https://discord.com/api/channels/${eventChannelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(await createDiscordEventReminderPayload(event)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord event reminder failed (${response.status}): ${errorText}`);
  }

  return true;
}

export async function sendDiscordGuildTradeNotification(input: {
  itemName: string;
  soldAmountGp: number;
  buyerName: string;
  buyerDiscordId?: string | null;
  buyerDiscordHandle?: string | null;
  linkedEventTitle?: string | null;
  linkedEventStartAt?: Date | null;
}) {
  const { botToken, guildTradeChannelId, adminRoleId, adminUserIds } = await getDiscordConfig();

  if (!botToken || !guildTradeChannelId) {
    return false;
  }

  const adminMention = adminRoleId
    ? `<@&${adminRoleId}>`
    : adminUserIds.length
      ? adminUserIds.map((userId) => `<@${userId}>`).join(" ")
      : "";
  const buyerMention = input.buyerDiscordId
    ? `<@${input.buyerDiscordId}>`
    : input.buyerDiscordHandle
      ? `@${input.buyerDiscordHandle}`
      : input.buyerName;

  const response = await fetch(`https://discord.com/api/channels/${guildTradeChannelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify({
      content: `${adminMention ? `${adminMention} ` : ""}Guild trade completed: **${input.itemName}** sold to ${buyerMention}.`,
      allowed_mentions: {
        parse: [],
        roles: adminRoleId ? [adminRoleId] : [],
        users: input.buyerDiscordId ? [...new Set([...adminUserIds, input.buyerDiscordId])] : adminUserIds,
      },
      embeds: [
        {
          title: "Warehouse member sale",
          color: 2322672,
          fields: [
            { name: "Item", value: input.itemName, inline: true },
            { name: "Buyer", value: input.buyerName, inline: true },
            { name: "Price", value: `${input.soldAmountGp} GP`, inline: true },
            ...(input.linkedEventTitle
              ? [
                  {
                    name: "Linked event",
                    value: input.linkedEventStartAt
                      ? `${input.linkedEventTitle} · ${formatDiscordEventDate(input.linkedEventStartAt)}`
                      : input.linkedEventTitle,
                    inline: false,
                  },
                ]
              : []),
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord guild trade notification failed (${response.status}): ${errorText}`);
  }

  return true;
}

async function openDiscordDmChannel(userId: string) {
  const { botToken } = await getDiscordConfig();

  if (!botToken) {
    throw new Error("Discord bot token is missing.");
  }

  const response = await fetch("https://discord.com/api/users/@me/channels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify({
      recipient_id: userId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord DM channel failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<{ id: string }>;
}

export async function sendDiscordAttendancePrompt(input: {
  discordId: string;
  attendanceId: string;
  eventTitle: string;
  startAt: Date;
  endAt: Date;
  attendanceMinutes: number;
}) {
  const { botToken } = await getDiscordConfig();

  if (!botToken) {
    return false;
  }

  const dm = await openDiscordDmChannel(input.discordId);
  const response = await fetch(`https://discord.com/api/channels/${dm.id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(createDiscordAttendancePayload(input)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord attendance DM failed (${response.status}): ${errorText}`);
  }

  return true;
}

export async function moveDiscordMemberToVoiceChannel(userId: string, voiceChannelId: string) {
  const { botToken, guildId } = await getDiscordConfig();

  if (!botToken || !guildId) {
    throw new Error("Discord bot token or guild ID is missing.");
  }

  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify({
      channel_id: voiceChannelId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord voice move failed (${response.status}): ${errorText}`);
  }
}

export function createDiscordEphemeralResponse(message: string) {
  return Response.json({
    type: DISCORD_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: message,
      flags: DISCORD_EPHEMERAL_FLAG
    }
  });
}

export function createDiscordPingResponse() {
  return Response.json({ type: DISCORD_PONG });
}

export function createDiscordApprovalUpdateResponse(user: { name: string; discordHandle: string }, status: ApprovalStatus, reviewerName: string) {
  return Response.json({
    type: DISCORD_UPDATE_MESSAGE,
    data: {
      content: `Registration for **${user.name}** (${user.discordHandle}) was ${status === ApprovalStatus.APPROVED ? "approved" : "rejected"} by ${reviewerName}.`,
      embeds: [],
      components: []
    }
  });
}

export function createDiscordInteractionMessageResponse(message: string) {
  return Response.json({
    type: DISCORD_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: message,
      flags: DISCORD_EPHEMERAL_FLAG,
    },
  });
}

export function createDiscordModalResponse(input: {
  customId: string;
  title: string;
  label: string;
  placeholder?: string;
}) {
  return Response.json({
    type: DISCORD_MODAL,
    data: {
      custom_id: input.customId,
      title: input.title,
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: "proofNote",
              label: input.label,
              style: 2,
              required: false,
              max_length: 400,
              placeholder: input.placeholder ?? "Optional note for the admin team",
            },
          ],
        },
      ],
    },
  });
}

export function isPingInteraction(interaction: DiscordInteraction) {
  return interaction.type === DISCORD_PING;
}

export function isMessageComponentInteraction(interaction: DiscordInteraction) {
  return interaction.type === DISCORD_MESSAGE_COMPONENT;
}

export function isModalSubmitInteraction(interaction: DiscordInteraction) {
  return interaction.type === DISCORD_MODAL_SUBMIT;
}
