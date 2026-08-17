import { ApprovalStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { Shell } from "@/components/shell";
import { Card, Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscordSettings } from "@/lib/settings";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const users = await prisma.user.findMany({
    where: {
      role: { not: UserRole.ADMIN }
    },
    orderBy: [
      { approvalStatus: "asc" },
      { createdAt: "desc" }
    ]
  });

  const pendingCount = users.filter((user) => user.approvalStatus === ApprovalStatus.PENDING).length;
  const discordSettings = await getDiscordSettings();
  const discordEnabled = Boolean(
    (discordSettings.discordBotToken && discordSettings.discordRegistrationChannelId && discordSettings.discordInteractionsPublicKey)
    || (discordSettings.discordApprovalWebhookUrl && discordSettings.discordInteractionsPublicKey),
  );

  return <Shell active="/approvals" title="Registration approvals" subtitle={`${pendingCount} requests waiting for manual review`}>
    <Card className="mb-5 p-5">
      <div className="text-sm font-semibold text-slate-800">Discord review</div>
      <p className="mt-1 text-sm text-slate-500">
        {discordEnabled
          ? "New registrations are also posted to Discord for admin review. Bot-based posting enables clickable approve and reject buttons."
          : "Discord review is not configured yet. Admins can still approve requests from this dashboard."}
      </p>
    </Card>
    {params.deleted === "1" ? <Card className="mb-5 border-red-100 bg-red-50 p-4">
      <div className="text-sm font-semibold text-red-700">Registration deleted permanently.</div>
    </Card> : null}
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1.2fr_1fr_.8fr_.7fr] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        <div>Applicant</div>
        <div>Discord</div>
        <div>Status</div>
        <div>Actions</div>
      </div>
      {users.map((user) => <div key={user.id} className="grid grid-cols-[1.2fr_1fr_.8fr_.7fr] gap-4 border-b border-slate-100 px-6 py-5 last:border-0">
        <div>
          <div className="font-semibold text-slate-900">{user.name}</div>
          <div className="mt-1 text-sm text-slate-500">{user.email}</div>
          <div className="mt-1 text-xs text-slate-400">Joined Discord: {user.joinedDiscord ? "Yes" : "No"}</div>
        </div>
        <div className="text-sm text-slate-700">{user.discordHandle}</div>
        <div>
          <Badge tone={user.approvalStatus === ApprovalStatus.APPROVED ? "green" : user.approvalStatus === ApprovalStatus.REJECTED ? "amber" : "blue"}>
            {user.approvalStatus}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <form action={`/api/admin/registrations/${user.id}/approve`} method="post">
            <button
              aria-label="Approve applicant"
              title="Approve"
              disabled={user.approvalStatus === ApprovalStatus.APPROVED}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Check size={18}/>
            </button>
          </form>
          <form action={`/api/admin/registrations/${user.id}/reject`} method="post">
            <button
              aria-label="Reject applicant"
              title="Reject"
              disabled={user.approvalStatus === ApprovalStatus.REJECTED}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <X size={18}/>
            </button>
          </form>
          <form action={`/api/admin/registrations/${user.id}/delete`} method="post">
            <button
              aria-label="Delete applicant permanently"
              title="Delete permanently"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              <Trash2 size={18}/>
            </button>
          </form>
        </div>
      </div>)}
    </Card>
  </Shell>;
}
