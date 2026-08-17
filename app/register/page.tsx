import Link from "next/link";
import { ArrowRight, MessageSquareMore, Swords } from "lucide-react";
import { getDiscordSettings } from "@/lib/settings";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const discordSettings = await getDiscordSettings();
  const errorMessage =
    (params.message ?? params.error === "exists")
      ? "An account with that email or Discord handle already exists."
      : params.error === "discord"
        ? "You must join the Discord server before sending a registration request."
        : params.error === "oauth"
          ? "Discord registration is not configured yet. Ask an admin to finish the OAuth setup."
          : undefined;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,.08)]">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white">
            <Swords />
          </div>
          <div>
            <div className="text-2xl font-extrabold">
              Request guild CRM access
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Registration stays pending until an admin confirms your Discord
              account and server membership.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-center gap-2 font-semibold">
            <MessageSquareMore size={16} />
            Approval rules
          </div>
          <div className="mt-2">
            Every applicant must provide a Discord account and already be inside
            the guild Discord server before approval.
          </div>
        </div>
        {discordSettings.discordInviteUrl ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              {discordSettings.discordServerName || "Guild Discord server"}
            </div>
            <div className="mt-1 text-slate-600">
              Join the server before registering so the admin can verify your
              membership during approval.
            </div>
            <a
              href={discordSettings.discordInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 visited:text-white inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Join Discord server <ArrowRight size={16} />
            </a>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {errorMessage}
          </div>
        ) : null}
        {discordSettings.discordOAuthClientId ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">
              Register with Discord
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Continue with your Discord account and we will use that identity
              for membership verification and admin approval.
            </p>
            <a
              href="/api/auth/discord/start?mode=register"
              className="mt-4 visited:text-white inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Continue with Discord
            </a>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Discord registration is currently unavailable because OAuth is not
            configured yet.
          </div>
        )}
        <p className="mt-5 text-center text-sm text-slate-500">
          Already approved?{" "}
          <Link className="font-semibold text-blue-600" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
