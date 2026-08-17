import { ApprovalStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getPostLoginDestination } from "@/lib/profile";
import {
  createDiscordSessionCookie,
  exchangeDiscordCode,
  findExistingUserByDiscord,
  getDiscordLoginError,
  getDiscordProfile,
  getDiscordStateCookieName,
  upsertDiscordRegistration
} from "@/lib/discord-oauth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = await getAppBaseUrl(url.origin);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = req.cookies.get(getDiscordStateCookieName())?.value;

  if (!code || !state || !stateCookie || decodeURIComponent(stateCookie) !== state) {
    return NextResponse.redirect(new URL(`/login?error=discord&message=${encodeURIComponent("Discord sign-in could not be verified.")}`, baseUrl), 303);
  }

  const mode = state.startsWith("login:") ? "login" : "register";

  try {
    const token = await exchangeDiscordCode(code, await getAppBaseUrl(url.origin));
    const profile = await getDiscordProfile(token.access_token);

    if (!profile.joinedDiscord) {
      const destination = mode === "register" ? "/register?error=discord" : `/login?error=discord&message=${encodeURIComponent("Join the Discord server before requesting access.")}`;
      const response = NextResponse.redirect(new URL(destination, baseUrl), 303);
      response.cookies.set(getDiscordStateCookieName(), "", { maxAge: 0, path: "/" });
      return response;
    }

    const existingUser = await findExistingUserByDiscord(profile.id, profile.email);

    if (mode === "login" && !existingUser) {
      const response = NextResponse.redirect(
        new URL(`/register?error=missing&message=${encodeURIComponent("No account exists for this Discord user yet. Start with Discord registration first.")}`, baseUrl),
        303
      );
      response.cookies.set(getDiscordStateCookieName(), "", { maxAge: 0, path: "/" });
      return response;
    }

    const user = await upsertDiscordRegistration(profile);

    if (user.approvalStatus === ApprovalStatus.APPROVED) {
      const destination = await getPostLoginDestination(user.id, user.role);
      const response = NextResponse.redirect(new URL(destination, baseUrl), 303);
      const cookie = createDiscordSessionCookie(user);
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      response.cookies.set(getDiscordStateCookieName(), "", { maxAge: 0, path: "/" });
      return response;
    }

    const response = NextResponse.redirect(
      new URL(mode === "login" ? getDiscordLoginError(user.approvalStatus) : "/login?registered=1", baseUrl),
      303
    );
    response.cookies.set(getDiscordStateCookieName(), "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("Discord OAuth callback failed:", error);
    const response = NextResponse.redirect(new URL(`/login?error=discord&message=${encodeURIComponent("Discord sign-in failed. Check the OAuth settings and try again.")}`, baseUrl), 303);
    response.cookies.set(getDiscordStateCookieName(), "", { maxAge: 0, path: "/" });
    return response;
  }
}
