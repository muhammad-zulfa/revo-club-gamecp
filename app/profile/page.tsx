import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getMemberProfileGate } from "@/lib/profile";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [params, gate, user] = await Promise.all([
    searchParams,
    getMemberProfileGate(session.userId),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        discordHandle: true,
      },
    }),
  ]);

  const member = gate.member;

  if (!member || !user) {
    redirect("/dashboard");
  }

  return (
    <Shell
      active="/profile"
      title="Complete your profile"
      subtitle="Your account is approved and already added as a guild member. Fill in your in-game details before continuing."
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <UserCircle2 size={18} />
            <span>Account</span>
          </div>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Display name</div>
              <div className="mt-1 text-base font-semibold text-slate-900">{user.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Email</div>
              <div className="mt-1 text-base font-semibold text-slate-900">{user.email}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Discord</div>
              <div className="mt-1 text-base font-semibold text-slate-900">@{user.discordHandle}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          {params.saved === "1" ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Profile saved.
            </div>
          ) : null}
          {params.error === "invalid" ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              Fill in a valid nickname, class, level, and race.
            </div>
          ) : null}

          <ProfileForm
            nickname={member.nickname}
            level={member.level}
            className={member.className === "Unset" ? "" : member.className}
            race={member.race}
          />
        </Card>
      </div>
    </Shell>
  );
}
