import { MemberStatus, Race, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Badge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getMembers } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatCurrencyValue } from "@/lib/warehouse";

function formatLastSeen(date: Date | null) {
  if (!date) return "Currently online";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const isAdmin = session.role === UserRole.ADMIN;
  const members = await getMembers();
  const users = await prisma.user
    .findMany({
      select: {
        id: true,
        name: true,
        gpBalance: true,
      },
    })
    .catch(() => []);
  const userById = new Map(users.map((user) => [user.id, user]));
  const userByName = new Map(users.map((user) => [user.name.trim().toLowerCase(), user]));

  return (
    <Shell
      active="/members"
      title="Guild members"
      subtitle={`${members.length} registered guild members`}
    >
      <div className="space-y-6">
        <Card className="p-5">
          <div className="text-sm text-slate-600">
            Guild member role defaults to <strong>Member</strong>. Admins can update nickname, level, class, race, guild role, member status, and online state from this screen.
          </div>
        </Card>

        {params.updated === "1" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-700">
              Guild member updated.
            </div>
          </Card>
        ) : null}

        {params.error === "invalid" ? (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-700">
              Fill in a valid member profile before saving.
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {members.map((member: any) => {
            const linkedUser =
              (member.userId ? userById.get(member.userId) : undefined) ??
              userByName.get(member.nickname.trim().toLowerCase());

            return (
              <Card key={member.id} className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">{member.nickname}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone={member.role === "Guild Master" ? "amber" : member.role === "Council" ? "blue" : "slate"}>
                      {member.role}
                    </Badge>
                    <span className="text-sm text-slate-500">{member.className}</span>
                    <span className="text-sm text-slate-400">Lv. {member.level}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {member.isOnline ? (
                    <div className="font-semibold text-emerald-600">Online now</div>
                  ) : (
                    <div className="font-semibold text-slate-500">Offline</div>
                  )}
                  <div className="mt-1 text-xs text-slate-400">
                    Last seen: {formatLastSeen(member.lastSeenAt)}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    GP: {formatCurrencyValue(linkedUser?.gpBalance ?? 0, "GP")}
                  </div>
                </div>
              </div>

              {isAdmin ? (
                <form
                  action={`/api/admin/guild-members/${member.id}`}
                  method="post"
                  className="grid gap-4 md:grid-cols-3"
                >
                  <input type="hidden" name="originalNickname" value={member.nickname} />
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">Nickname</span>
                    <input
                      name="nickname"
                      defaultValue={member.nickname}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">Level</span>
                    <input
                      type="number"
                      min="1"
                      name="level"
                      defaultValue={member.level}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">Class</span>
                    <input
                      name="className"
                      defaultValue={member.className}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">Race</span>
                    <select
                      name="race"
                      defaultValue={member.race}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      {Object.values(Race).map((race) => (
                        <option key={race} value={race}>
                          {race}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">Guild role</span>
                    <input
                      name="role"
                      defaultValue={member.role || "Member"}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">Member status</span>
                    <select
                      name="status"
                      defaultValue={member.status}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      {Object.values(MemberStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">GP balance</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="gpBalance"
                      defaultValue={linkedUser?.gpBalance ?? 0}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                      Updates the linked app account for this member.
                    </span>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      name="isOnline"
                      defaultChecked={member.isOnline}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>Marked as online in the internal guild roster</span>
                  </label>
                  <div className="md:col-span-3">
                    <button className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                      Save member
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-sm text-slate-500">
                  Only admins can update guild member details.
                </div>
              )}
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
