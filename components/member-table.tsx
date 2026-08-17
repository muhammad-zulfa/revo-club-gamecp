import { Badge, Card } from "./ui";

export function MemberTable({ members }: { members: any[] }) {
  return <Card className="overflow-hidden"><div className="grid grid-cols-[1.5fr_.7fr_1fr_1fr_.8fr] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-400"><div>Character</div><div>Level</div><div>Class</div><div>Guild role</div><div>Status</div></div>
    {members.map((m) => <div key={m.id} className="grid grid-cols-[1.5fr_.7fr_1fr_1fr_.8fr] items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-0"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 font-bold text-slate-500">{m.nickname.slice(0,1).toUpperCase()}</div><div><div className="font-semibold">{m.nickname}</div><div className="text-xs text-slate-400">Accretia</div></div></div><div className="font-semibold">{m.level}</div><div className="text-sm text-slate-600">{m.className}</div><div><Badge tone={m.role === "Guild Master" ? "amber" : m.role === "Council" ? "blue" : "slate"}>{m.role}</Badge></div><div>{m.isOnline ? <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Online</span> : <span className="text-sm text-slate-400">Offline</span>}</div></div>)}
  </Card>
}
