import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Badge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getMembers } from "@/lib/data";

function formatLastSeen(date: Date | null) {
  if (!date) return "Currently online";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function OnlineMembersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const members = await getMembers();
  const onlineMembers = members.filter((member: any) => member.isOnline);

  return (
    <Shell
      active="/online-members"
      title="Online members"
      subtitle={`${onlineMembers.length} members currently marked online`}
    >
      <div className="space-y-6">
        <Card className="p-5">
          <div className="text-sm text-slate-600">
            Online and offline state currently comes from the CRM database field <code>isOnline</code>. It is not yet synced from the game or Discord automatically, so admins manage it manually from the Members page. When a member is marked offline, <code>lastSeenAt</code> is updated.
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {onlineMembers.map((member: any) => (
            <Card key={member.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">{member.nickname}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {member.className} · Lv. {member.level}
                  </div>
                  <div className="mt-2">
                    <Badge tone={member.role === "Guild Master" ? "amber" : member.role === "Council" ? "blue" : "slate"}>
                      {member.role}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-600">Online</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Last seen: {formatLastSeen(member.lastSeenAt)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
