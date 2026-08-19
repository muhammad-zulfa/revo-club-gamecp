import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getDiscordSettings } from "@/lib/settings";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const discordSettings = await getDiscordSettings();

  return <Shell active="/settings" title="Settings" subtitle="Application and guild preferences">
    <div className="grid gap-6">
      <Card className="max-w-3xl p-7">
        <h2 className="font-bold">Online status source</h2>
        <p className="mt-1 text-sm text-slate-500">For now the CRM uses its own database. RF official API integration is intentionally disabled.</p>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Mode: <strong>Standalone database</strong></div>
      </Card>
      <Card className="max-w-4xl p-7">
        <h2 className="font-bold">Discord registration settings</h2>
        <p className="mt-1 text-sm text-slate-500">These settings control the public app domain, Discord join prompt on registration, and where approval or trade notifications get posted.</p>
        {params.saved === "1" ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Settings saved.</div> : null}
        <form action="/api/admin/settings/discord" method="post" className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">App base URL</span>
            <input name="appBaseUrl" defaultValue={discordSettings.appBaseUrl} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Use your public domain here, for example <code>https://crm.yourguild.com</code>. Discord OAuth callbacks and other external URLs will use this instead of localhost.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Discord server name</span>
            <input name="discordServerName" defaultValue={discordSettings.discordServerName} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Discord invite URL</span>
            <input name="discordInviteUrl" defaultValue={discordSettings.discordInviteUrl} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Registration channel label</span>
            <input name="discordRegistrationLabel" defaultValue={discordSettings.discordRegistrationLabel} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Registration channel ID</span>
            <input name="discordRegistrationChannelId" defaultValue={discordSettings.discordRegistrationChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Event reminder channel ID</span>
            <input name="discordEventChannelId" defaultValue={discordSettings.discordEventChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Fallback channel for event reminders when no category-specific channel is configured.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">News channel ID</span>
            <input name="discordNewsChannelId" defaultValue={discordSettings.discordNewsChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Used when posting guild news and information updates to Discord.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Guild trade channel ID</span>
            <input name="discordGuildTradeChannelId" defaultValue={discordSettings.discordGuildTradeChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Used to notify admins when a warehouse item is sold to a member using GP.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Pit Boss channel ID</span>
            <input name="discordPitBossChannelId" defaultValue={discordSettings.discordPitBossChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Chip War channel ID</span>
            <input name="discordChipWarChannelId" defaultValue={discordSettings.discordChipWarChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">GvG channel ID</span>
            <input name="discordGvgChannelId" defaultValue={discordSettings.discordGvgChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Other channel ID</span>
            <input name="discordOtherChannelId" defaultValue={discordSettings.discordOtherChannelId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Member role ID to mention</span>
            <input name="discordMemberRoleId" defaultValue={discordSettings.discordMemberRoleId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Use your guild member role here so event reminders can tag everyone in that role.</span>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Reminder offsets in minutes</span>
            <input name="discordEventReminderOffsets" defaultValue={discordSettings.discordEventReminderOffsets} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Comma-separated values. Example: <code>60,15,0,-10</code> means 60 minutes before, 15 minutes before, at start time, and 10 minutes after start.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Attendance minutes required</span>
            <input name="discordEventAttendanceMinutes" defaultValue={discordSettings.discordEventAttendanceMinutes} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Members are auto-marked present after staying in the event voice channel for at least this many minutes.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Member sale fee percent</span>
            <input name="warehouseMemberSaleFeePercent" defaultValue={discordSettings.warehouseMemberSaleFeePercent} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">When a guild member sale item is bought with GP inside the warehouse, this percentage is credited to the guild GP balance.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Approval webhook URL</span>
            <input name="discordApprovalWebhookUrl" defaultValue={discordSettings.discordApprovalWebhookUrl} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Bot token</span>
            <input name="discordBotToken" defaultValue={discordSettings.discordBotToken} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">When set with a registration channel ID, the app will post button-enabled approval messages as your Discord app instead of using the plain webhook.</span>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Interactions public key</span>
            <input name="discordInteractionsPublicKey" defaultValue={discordSettings.discordInteractionsPublicKey} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Admin role ID</span>
            <input name="discordAdminRoleId" defaultValue={discordSettings.discordAdminRoleId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Fallback admin user IDs</span>
            <input name="discordAdminUserIds" defaultValue={discordSettings.discordAdminUserIds} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">OAuth client ID</span>
            <input name="discordOAuthClientId" defaultValue={discordSettings.discordOAuthClientId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">OAuth client secret</span>
            <input name="discordOAuthClientSecret" defaultValue={discordSettings.discordOAuthClientSecret} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">Discord guild ID</span>
            <input name="discordGuildId" defaultValue={discordSettings.discordGuildId} className="w-full rounded-xl border border-slate-200 px-4 py-3"/>
            <span className="mt-1 block text-xs text-slate-400">Used to confirm the user already joined your Discord server during OAuth registration.</span>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
            Event attendance tracking requires the Discord bot token, guild ID, interaction endpoint, and a separate attendance bot worker running with the same database.
          </div>
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white md:col-span-2 md:justify-self-start">Save Discord settings</button>
        </form>
      </Card>
    </div>
  </Shell>;
}
