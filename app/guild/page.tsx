import { Race, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getGuildProfile } from "@/lib/data";

export default async function GuildPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const isAdmin = session.role === UserRole.ADMIN;
  const guild = await getGuildProfile();

  return (
    <Shell
      active="/guild"
      title="Guild management"
      subtitle="Manage guild identity and internal configuration"
    >
      <div className="space-y-6">
        <Card className="p-5">
          <div className="text-sm text-slate-600">
            This page controls the guild profile used across the CRM. Member online/offline state is not derived from this page; it is currently maintained manually in the guild member roster.
          </div>
        </Card>

        {params.saved === "1" ? (
          <Card className="border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-700">
              Guild profile updated.
            </div>
          </Card>
        ) : null}

        {params.error === "invalid" ? (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-semibold text-amber-700">
              Fill in a valid guild name, world, and race before saving.
            </div>
          </Card>
        ) : null}

        <Card className="p-7">
          {isAdmin ? (
            <form action="/api/admin/guild" method="post" className="grid max-w-4xl gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Guild name
                <input
                  name="name"
                  defaultValue={guild.name}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                World
                <input
                  name="worldName"
                  defaultValue={guild.worldName}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Race
                <select
                  name="race"
                  defaultValue={guild.race}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                >
                  {Object.values(Race).map((race) => (
                    <option key={race} value={race}>
                      {race}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-600 md:col-span-2">
                Description
                <textarea
                  name="description"
                  rows={5}
                  defaultValue={guild.description ?? ""}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <div className="md:col-span-2">
                <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
                  Save changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid max-w-4xl gap-5 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-slate-500">Guild name</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{guild.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">World</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{guild.worldName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Race</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{guild.race}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-slate-500">Description</div>
                <div className="mt-2 text-slate-700">{guild.description || "No description yet."}</div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
