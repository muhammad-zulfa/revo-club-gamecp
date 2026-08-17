import { Swords } from "lucide-react";
import Link from "next/link";
import { getDiscordSettings } from "@/lib/settings";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    registered?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const discordSettings = await getDiscordSettings();
  const errorMessage =
    params.message ??
    (params.error === "invalid"
      ? "Incorrect email or password."
      : params.error === "pending"
        ? "Your registration is waiting for admin approval."
        : params.error === "rejected"
          ? "Your registration was rejected by an admin."
          : params.error === "discord"
            ? "Join the Discord server before requesting access."
            : undefined);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,.08)]">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white">
            <Swords />
          </div>
          <div>
            <div className="text-xl font-extrabold">RF Guild CRM</div>
            <div className="text-sm text-slate-400">
              Guild access requires approval
            </div>
          </div>
        </div>
        {params.registered === "1" ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Registration submitted. An admin must verify your Discord membership
            before you can sign in.
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {errorMessage}
          </div>
        ) : null}
        {discordSettings.discordOAuthClientId ? (
          <a
            href="/api/auth/discord/start?mode=login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sign in with Discord
          </a>
        ) : null}
        {discordSettings.discordOAuthClientId ? (
          <div className="mt-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.12em] text-slate-300">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or use email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        ) : null}
        <form className="mt-8 space-y-4" action="/api/auth/login" method="post">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Email
            </span>
            <input
              name="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Password
            </span>
            <input
              type="password"
              name="password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />
          </label>
          <button className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
            Sign in
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Need access?{" "}
          <Link className="font-semibold text-blue-600" href="/register">
            Request registration
          </Link>
        </p>
      </div>
    </main>
  );
}
