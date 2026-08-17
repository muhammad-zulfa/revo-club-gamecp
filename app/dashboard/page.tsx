import { Shell } from "@/components/shell";
import { Card, Stat } from "@/components/ui";
import { MemberTable } from "@/components/member-table";
import { getActivities, getMembers } from "@/lib/data";

export default async function Dashboard() {
  const members = await getMembers();
  const activities = await getActivities();
  const online = members.filter((m:any)=>m.isOnline);
  return <Shell active="/dashboard" title="Guild dashboard" subtitle="Overview of Brave Fox on RF Default Fresh">
    <div className="grid grid-cols-4 gap-5"><Stat label="Total members" value={members.length} hint="Standalone database"/><Stat label="Online now" value={online.length} hint="Manual/internal status"/><Stat label="Average level" value={Math.round(members.reduce((s:any,m:any)=>s+m.level,0)/members.length)} hint="Across all members"/><Stat label="Leadership" value={members.filter((m:any)=>["Guild Master","Council"].includes(m.role)).length} hint="GM + Council"/></div>
    <div className="mt-6 grid grid-cols-[1.6fr_.9fr] gap-6"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Online members</h2><a className="text-sm font-semibold text-blue-600" href="/online-members">View all</a></div><MemberTable members={online.slice(0,5)}/></div><div><h2 className="mb-3 text-lg font-bold">Recent activity</h2><Card className="p-2">{activities.map((a:any)=><div key={a.id} className="border-b border-slate-100 p-4 last:border-0"><div className="text-sm font-semibold">{a.title}</div><div className="mt-1 text-xs text-slate-400">{a.detail}</div></div>)}</Card></div></div>
  </Shell>
}
