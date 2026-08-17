import { randomBytes } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";
import { createSessionValue, getApprovalMessage, getSessionCookieName, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscordSettings } from "@/lib/settings";
import { sendDiscordRegistrationNotification } from "@/lib/discord";
import { ApprovalStatus } from "@prisma/client";

const DISCORD_API = "https://discord.com/api";
const DISCORD_STATE_COOKIE = "rf_discord_oauth_state";

type DiscordOAuthMode = "login" | "register";

type DiscordUserResponse = {
  id: string;
  username: string;
  global_name?: string | null;
  email?: string | null;
};

type DiscordGuildResponse = {
  id: string;
  name: string;
};

export async function getDiscordOAuthConfig() {
  const settings = await getDiscordSettings();

  return {
    clientId: settings.discordOAuthClientId,
    clientSecret: settings.discordOAuthClientSecret,
    guildId: settings.discordGuildId
  };
}

export function getDiscordStateCookieName() {
  return DISCORD_STATE_COOKIE;
}

export function createDiscordOAuthState(mode: DiscordOAuthMode) {
  return `${mode}:${randomBytes(16).toString("hex")}`;
}

export async function getDiscordOAuthRedirectUri(origin?: string) {
  return new URL("/api/auth/discord/callback", await getAppBaseUrl(origin)).toString();
}

export async function createDiscordAuthorizeUrl(origin: string | undefined, mode: DiscordOAuthMode) {
  const { clientId } = await getDiscordOAuthConfig();
  if (!clientId) return null;

  const state = createDiscordOAuthState(mode);
  const url = new URL(`${DISCORD_API}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", await getDiscordOAuthRedirectUri(origin));
  url.searchParams.set("scope", "identify email guilds");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return { url: url.toString(), state };
}

export async function exchangeDiscordCode(code: string, origin?: string) {
  const { clientId, clientSecret } = await getDiscordOAuthConfig();
  if (!clientId || !clientSecret) throw new Error("Discord OAuth is not configured.");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: await getDiscordOAuthRedirectUri(origin)
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed (${response.status})`);
  }

  return response.json() as Promise<{ access_token: string }>;
}

async function fetchDiscordUser(accessToken: string) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Discord user fetch failed (${response.status})`);
  }

  return response.json() as Promise<DiscordUserResponse>;
}

async function fetchDiscordGuilds(accessToken: string) {
  const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Discord guild fetch failed (${response.status})`);
  }

  return response.json() as Promise<DiscordGuildResponse[]>;
}

export async function getDiscordProfile(accessToken: string) {
  const [{ guildId }, discordUser, guilds] = await Promise.all([
    getDiscordOAuthConfig(),
    fetchDiscordUser(accessToken),
    fetchDiscordGuilds(accessToken)
  ]);

  const joinedDiscord = guildId ? guilds.some((guild) => guild.id === guildId) : true;

  return {
    id: discordUser.id,
    email: discordUser.email?.toLowerCase() || `${discordUser.id}@discord.local`,
    name: discordUser.global_name || discordUser.username,
    discordHandle: discordUser.username,
    joinedDiscord
  };
}

export async function findExistingUserByDiscord(discordId: string, email: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ discordId }, { email }]
    }
  });
}

export async function upsertDiscordRegistration(profile: { id: string; email: string; name: string; discordHandle: string; joinedDiscord: boolean }) {
  const existingUser = await findExistingUserByDiscord(profile.id, profile.email);
  const passwordHash = existingUser?.passwordHash || hashPassword(randomBytes(24).toString("hex"));

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: existingUser.email || profile.email,
          name: profile.name,
          discordHandle: profile.discordHandle,
          discordId: profile.id,
          joinedDiscord: profile.joinedDiscord
        }
      })
    : await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          discordHandle: profile.discordHandle,
          discordId: profile.id,
          joinedDiscord: profile.joinedDiscord,
          passwordHash
        }
      });

  if (!existingUser && user.approvalStatus === ApprovalStatus.PENDING) {
    await sendDiscordRegistrationNotification({
      id: user.id,
      name: user.name,
      email: user.email,
      discordHandle: user.discordHandle,
      discordId: user.discordId
    }).catch((error) => {
      console.error("Discord registration notification failed:", error);
    });
  }

  return user;
}

export function createDiscordSessionCookie(user: { id: string; email: string; name: string; role: "ADMIN" | "MEMBER" }) {
  return {
    name: getSessionCookieName(),
    value: createSessionValue({
      email: user.email,
      name: user.name,
      role: user.role,
      userId: user.id
    }),
    options: { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 8 }
  };
}

export function getDiscordLoginError(status: ApprovalStatus) {
  return `/login?error=${status.toLowerCase()}&message=${encodeURIComponent(getApprovalMessage(status))}`;
}
