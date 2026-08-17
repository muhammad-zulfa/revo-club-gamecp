import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  createDiscordAuthorizeUrl,
  getDiscordStateCookieName,
} from "@/lib/discord-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "login" ? "login" : "register";
  const authorize = await createDiscordAuthorizeUrl(await getAppBaseUrl(url.origin), mode);

  if (!authorize) {
    return NextResponse.redirect(
      new URL(
        `/login?error=discord&message=${encodeURIComponent("Discord OAuth is not configured yet.")}`,
        req.url,
      ),
      303,
    );
  }

  const response = NextResponse.redirect(authorize.url, 303);
  response.cookies.set(getDiscordStateCookieName(), authorize.state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
