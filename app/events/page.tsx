import { UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileUp, Plus, X } from "lucide-react";
import { EventsCalendar } from "@/components/events-calendar";
import { Shell } from "@/components/shell";
import { TimezoneOffsetInput } from "@/components/timezone-offset-input";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getEventsInRange } from "@/lib/data";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  eventCategoryOptions,
  eventRepeatOptions,
  formatDateKey,
  formatDayLabel,
  startOfMonth,
  parseViewDate,
  startOfDay,
  startOfWeek,
} from "@/lib/events";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    saved?: string;
    count?: string;
    discord?: string;
    imported?: string;
    error?: string;
    panel?: string;
  }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const view =
    params.view === "day" || params.view === "month" ? params.view : "week";
  const selectedDate = parseViewDate(params.date);
  const rangeStart =
    view === "day"
      ? startOfDay(selectedDate)
      : view === "month"
        ? startOfMonth(selectedDate)
        : startOfWeek(selectedDate);
  const rangeEnd =
    view === "day"
      ? endOfDay(selectedDate)
      : view === "month"
        ? endOfMonth(selectedDate)
        : endOfWeek(selectedDate);
  const events = await getEventsInRange(rangeStart, rangeEnd);
  const isAdmin = session.role === UserRole.ADMIN;
  const panel =
    params.panel === "import"
      ? "import"
      : params.panel === "create"
        ? "create"
        : null;
  const isPanelOpen = Boolean(isAdmin && panel);
  const baseQuery = `view=${view}&date=${formatDateKey(selectedDate)}`;

  const feedbackMessage =
    params.saved === "1" && params.discord === "sent"
      ? "Event created and Discord reminder sent."
      : params.saved === "1" && params.discord === "sent-first"
        ? `${params.count ?? "Multiple"} events created. Discord reminder sent for the first event only.`
        : params.saved === "1" && params.discord === "skipped"
          ? "Event created. Discord reminder was skipped because the event channel or bot is not configured."
          : params.saved === "1" && params.discord === "skipped-first"
            ? `${params.count ?? "Multiple"} events created. Discord reminder for the first event was skipped because the event channel or bot is not configured.`
            : params.saved === "1" && params.discord === "failed"
              ? "Event created, but the Discord reminder failed."
              : params.saved === "1" && params.discord === "failed-first"
                ? `${params.count ?? "Multiple"} events created, but the Discord reminder for the first event failed.`
                : params.saved === "1"
                  ? params.count && params.count !== "1"
                    ? `${params.count} events created.`
                    : "Event created."
      : params.imported === "1"
        ? "CSV events imported."
        : params.error === "missing"
          ? "Fill in title, start, and end before saving."
          : params.error === "range"
            ? "End time must be after start time."
            : params.error === "repeat"
              ? "Choose a valid repeat option and a repeat-until date for recurring events."
            : params.error === "csv"
              ? "Upload a valid CSV with title, category, startAt, and endAt columns."
              : undefined;

  return (
    <Shell
      active="/events"
      title="Events"
      subtitle={`Guild schedule centered on ${formatDayLabel(selectedDate)}`}
      action={
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <>
              <Link
                href={`/events?${baseQuery}&panel=create`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus size={16} />
                <span>Create event</span>
              </Link>
              <Link
                href={`/events?${baseQuery}&panel=import`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FileUp size={16} />
                <span>Import CSV</span>
              </Link>
            </>
          ) : null}
        </div>
      }
    >
      <div
        className={`grid gap-6 overflow-hidden ${
          isPanelOpen
            ? "h-[calc(100dvh-185px)] xl:grid-cols-[1.6fr_.9fr]"
            : "h-[calc(100dvh-185px)]"
        }`}
      >
        <div className="flex min-h-0 flex-col gap-6">
          {feedbackMessage ? (
            <Card
              className={`shrink-0 p-4 ${params.error ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
            >
              <div
                className={`text-sm font-semibold ${params.error ? "text-amber-700" : "text-emerald-700"}`}
              >
                {feedbackMessage}
              </div>
            </Card>
          ) : null}

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
            <EventsCalendar
              selectedDate={formatDateKey(selectedDate)}
              view={view}
              isAdmin={isAdmin}
              events={events.map((event) => ({
                id: event.id,
                title: event.title,
                description: event.description,
                category: event.category,
                startAt: event.startAt.toISOString(),
                endAt: event.endAt.toISOString(),
                bonusDistribution: {
                  distributedAt: event.bonusDistributedAt?.toISOString() ?? null,
                  participantCount: event.bonusParticipantCount ?? null,
                  totalGp: event.bonusTotalGp ?? null,
                  guildShareGp: event.bonusGuildShareGp ?? null,
                  perParticipantGp: event.bonusPerParticipantGp ?? null,
                },
                warehouseSummary: {
                  linkedItemCount: event.warehouseItems.length,
                  totalGp: event.warehouseItems
                    .filter((item) => item.askingPriceCurrency === "GP")
                    .reduce((sum, item) => sum + item.askingPrice, 0),
                },
                attendanceSummary: {
                  present: event.attendees.filter((attendance) => Boolean(attendance.qualifiedAt)).length,
                  inVoice: event.attendees.filter((attendance) => attendance.status === "IN_VOICE").length,
                  left: event.attendees.filter((attendance) => attendance.status === "LEFT").length,
                  confirmed: event.attendees.filter((attendance) => Boolean(attendance.confirmedAt)).length,
                },
                attendees: event.attendees.map((attendance) => ({
                  name: attendance.user?.name || attendance.discordHandle || attendance.discordId,
                  userId: attendance.userId,
                  discordHandle: attendance.discordHandle || attendance.discordId,
                  discordId: attendance.discordId,
                  status: attendance.status,
                  totalSecondsInVoice: attendance.totalSecondsInVoice,
                  firstJoinedAt: attendance.firstJoinedAt?.toISOString() ?? null,
                  lastLeftAt: attendance.lastLeftAt?.toISOString() ?? null,
                  qualifiedAt: attendance.qualifiedAt?.toISOString() ?? null,
                  confirmedAt: attendance.confirmedAt?.toISOString() ?? null,
                  proofNote: attendance.proofNote,
                })),
              }))}
            />
          </Card>
        </div>

        {isAdmin && panel === "create" ? (
          <div className="min-h-0 overflow-y-auto">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Plus size={18} />
                  <span>Create event</span>
                </div>
                <Link
                  href={`/events?${baseQuery}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X size={16} />
                </Link>
              </div>
              <form
                action="/api/admin/events/create"
                method="post"
                className="space-y-4"
              >
                <TimezoneOffsetInput />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    Title
                  </span>
                  <input
                    name="title"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    Category
                  </span>
                  <select
                    name="category"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {eventCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    Start
                  </span>
                  <input
                    type="datetime-local"
                    name="startAt"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    End
                  </span>
                  <input
                    type="datetime-local"
                    name="endAt"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">
                      Repeat
                    </span>
                    <select
                      name="repeat"
                      defaultValue="none"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      {eventRepeatOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-600">
                      Repeat until
                    </span>
                    <input
                      type="date"
                      name="repeatUntil"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                      Only needed when the event repeats. Series are capped at 60 events.
                    </span>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    Description
                  </span>
                  <textarea
                    name="description"
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    Discord voice channel ID
                  </span>
                  <input
                    name="discordVoiceChannelId"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    Optional. Members clicking the Discord button will be moved into this voice channel.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="sendDiscordReminder"
                    defaultChecked
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>Send Discord reminder immediately after saving. For recurring events, this only sends the first event immediately.</span>
                </label>
                <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
                  Save event
                </button>
              </form>
            </Card>
          </div>
        ) : null}

        {isAdmin && panel === "import" ? (
          <div className="min-h-0 overflow-y-auto">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <FileUp size={18} />
                  <span>Import CSV</span>
                </div>
                <Link
                  href={`/events?${baseQuery}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X size={16} />
                </Link>
              </div>
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Required columns: <code>title</code>, <code>category</code>,{" "}
                <code>startAt</code>, <code>endAt</code>. Optional:{" "}
                <code>description</code>.
              </div>
              <form
                action="/api/admin/events/import"
                method="post"
                encType="multipart/form-data"
                className="space-y-4"
              >
                <TimezoneOffsetInput />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">
                    CSV file
                  </span>
                  <input
                    type="file"
                    name="csvFile"
                    accept=".csv,text/csv"
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold"
                  />
                </label>
                <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                  Import events
                </button>
              </form>
            </Card>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
