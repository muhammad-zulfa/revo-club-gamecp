"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  dateFnsLocalizer,
  type Components,
  type EventProps,
  type ToolbarProps,
  Views,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  FileText,
  MessageSquareText,
  Send,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Badge } from "@/components/ui";

type CalendarView = "day" | "week" | "month";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  category: "PIT_BOSS" | "CHIP_WAR" | "GVG" | "OTHER";
  startAt: string;
  endAt: string;
  bonusDistribution?: {
    distributedAt: string | null;
    participantCount: number | null;
    totalGp: number | null;
    guildShareGp: number | null;
    perParticipantGp: number | null;
  };
  warehouseSummary?: {
    linkedItemCount: number;
    totalGp: number;
  };
  attendanceSummary?: {
    present: number;
    inVoice: number;
    left: number;
    confirmed: number;
  };
  attendees?: Array<{
    name: string;
    userId?: string | null;
    discordHandle: string;
    discordId: string;
    status: "IN_VOICE" | "LEFT" | "PRESENT";
    totalSecondsInVoice: number;
    firstJoinedAt: string | null;
    lastLeftAt: string | null;
    qualifiedAt: string | null;
    confirmedAt: string | null;
    proofNote: string | null;
  }>;
};

type CalendarEventRecord = {
  id: string;
  title: string;
  description: string | null;
  category: CalendarEvent["category"];
  start: Date;
  end: Date;
  bonusDistribution?: CalendarEvent["bonusDistribution"];
  warehouseSummary?: CalendarEvent["warehouseSummary"];
  attendanceSummary?: CalendarEvent["attendanceSummary"];
  attendees?: CalendarEvent["attendees"];
};

type EventsCalendarProps = {
  events: CalendarEvent[];
  selectedDate: string;
  view: CalendarView;
  isAdmin?: boolean;
};

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getEventVariant(category: CalendarEvent["category"]) {
  if (category === "PIT_BOSS") return "rf-calendar-event--blue";
  if (category === "CHIP_WAR") return "rf-calendar-event--amber";
  if (category === "GVG") return "rf-calendar-event--green";
  return "rf-calendar-event--slate";
}

function getEventTone(
  category: CalendarEvent["category"],
): "blue" | "green" | "amber" | "slate" {
  if (category === "PIT_BOSS") return "blue";
  if (category === "CHIP_WAR") return "amber";
  if (category === "GVG") return "green";
  return "slate";
}

function getEventLabel(category: CalendarEvent["category"]) {
  if (category === "PIT_BOSS") return "Pit Boss";
  if (category === "CHIP_WAR") return "Chip War";
  if (category === "GVG") return "GvG";
  return "Other";
}

function getAttendanceTone(status: "IN_VOICE" | "LEFT" | "PRESENT") {
  if (status === "PRESENT") return "green";
  if (status === "IN_VOICE") return "blue";
  return "slate";
}

function getAttendanceLabel(status: "IN_VOICE" | "LEFT" | "PRESENT") {
  if (status === "PRESENT") return "Present";
  if (status === "IN_VOICE") return "In voice";
  return "Left";
}

function formatAttendanceDuration(totalSecondsInVoice: number) {
  const totalMinutes = Math.max(0, Math.floor(totalSecondsInVoice / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getAttendanceSortOrder(status: "IN_VOICE" | "LEFT" | "PRESENT") {
  if (status === "PRESENT") return 0;
  if (status === "IN_VOICE") return 1;
  return 2;
}

function formatGpValue(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)} GP`;
}

function formatAttendanceTimestamp(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function AttendanceModal({
  open,
  onClose,
  eventTitle,
  attendees,
}: {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  attendees: NonNullable<CalendarEvent["attendees"]>;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sortedAttendees = [...attendees].sort((left, right) => {
    const orderDiff =
      getAttendanceSortOrder(left.status) - getAttendanceSortOrder(right.status);

    if (orderDiff !== 0) return orderDiff;

    const leftJoinedAt = left.firstJoinedAt ? new Date(left.firstJoinedAt).getTime() : 0;
    const rightJoinedAt = right.firstJoinedAt ? new Date(right.firstJoinedAt).getTime() : 0;

    return leftJoinedAt - rightJoinedAt;
  });

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[84dvh] w-full max-w-4xl flex-col rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-xl font-bold text-slate-900">
              Attendance list
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {eventTitle} · {attendees.length} member{attendees.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Close attendance list"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {sortedAttendees.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {sortedAttendees.map((attendee) => (
              <div
                key={`${attendee.discordId}-${attendee.name}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900">
                      {attendee.name}
                    </div>
                    <div className="truncate text-sm text-slate-500">
                      @{attendee.discordHandle}
                    </div>
                  </div>
                  <Badge tone={getAttendanceTone(attendee.status)}>
                    {getAttendanceLabel(attendee.status)}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  In voice: {formatAttendanceDuration(attendee.totalSecondsInVoice)}
                  {attendee.confirmedAt ? " · Confirmed" : ""}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {formatAttendanceTimestamp(attendee.firstJoinedAt)
                    ? `Joined: ${formatAttendanceTimestamp(attendee.firstJoinedAt)}`
                    : "Joined: n/a"}
                  {formatAttendanceTimestamp(attendee.lastLeftAt)
                    ? ` · Left: ${formatAttendanceTimestamp(attendee.lastLeftAt)}`
                    : attendee.status === "IN_VOICE"
                      ? " · Still in voice"
                      : ""}
                </div>
                {attendee.proofNote ? (
                  <div className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                    <MessageSquareText size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="leading-6 break-words">{attendee.proofNote}</div>
                  </div>
                ) : null}
              </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              No attendance records yet for this event.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function EventCard({
  event,
  isAdmin = false,
}: EventProps<CalendarEventRecord> & { isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [isDistributingBonus, setIsDistributingBonus] = useState(false);
  const [bonusFeedback, setBonusFeedback] = useState<string | null>(null);
  const startLabel = format(event.start, "h:mm a");
  const endLabel = format(event.end, "h:mm a");
  const fullDate = format(event.start, "EEEE, MMMM d, yyyy");

  const handleSendReminder = async () => {
    if (isSendingReminder) return;

    setIsSendingReminder(true);
    setReminderFeedback(null);

    try {
      const response = await fetch(`/api/admin/events/${event.id}/reminder`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setReminderFeedback(data?.message ?? "Reminder could not be sent.");
        return;
      }

      setReminderFeedback(data?.message ?? "Reminder sent to Discord.");
      router.refresh();
    } catch {
      setReminderFeedback("Reminder could not be sent.");
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleDistributeBonus = async () => {
    if (isDistributingBonus) return;

    setIsDistributingBonus(true);
    setBonusFeedback(null);

    try {
      const response = await fetch(`/api/admin/events/${event.id}/distribute-bonus`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setBonusFeedback(data?.message ?? "Bonus could not be distributed.");
        return;
      }

      setBonusFeedback(data?.message ?? "Bonus distributed.");
      router.refresh();
    } catch {
      setBonusFeedback("Bonus could not be distributed.");
    } finally {
      setIsDistributingBonus(false);
    }
  };

  const linkedItemCount = event.warehouseSummary?.linkedItemCount ?? 0;
  const linkedTotalGp = event.warehouseSummary?.totalGp ?? 0;
  const eligibleParticipants =
    event.attendees?.filter((attendee) => Boolean(attendee.userId) && (Boolean(attendee.qualifiedAt) || Boolean(attendee.confirmedAt))).length ?? 0;
  const alreadyDistributed = Boolean(event.bonusDistribution?.distributedAt);
  const memberShareGp = linkedTotalGp * 0.8;
  const guildShareGp = linkedTotalGp * 0.2;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="rf-calendar-event-card">
          <div className="rf-calendar-event-title">{event.title}</div>
          <div className="rf-calendar-event-meta">{startLabel}</div>
          {event.description ? (
            <div className="rf-calendar-event-description">
              {event.description}
            </div>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="rf-calendar-popover">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold leading-6 text-slate-900">
              {event.title}
            </div>
            <div className="mt-1 text-sm text-slate-500">{fullDate}</div>
          </div>
          <Badge tone={getEventTone(event.category)}>
            {getEventLabel(event.category)}
          </Badge>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 text-sm text-slate-700">
            <Clock3 size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <div className="font-semibold text-slate-900">Time</div>
              <div>
                {startLabel} - {endLabel}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm text-slate-700">
            <Tag size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <div className="font-semibold text-slate-900">Category</div>
              <div>{getEventLabel(event.category)}</div>
            </div>
          </div>

          {event.description ? (
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <FileText size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <div className="font-semibold text-slate-900">Description</div>
                <div className="leading-6 text-slate-600">
                  {event.description}
                </div>
              </div>
            </div>
          ) : null}

          {isAdmin && event.attendanceSummary ? (
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <Clock3 size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <div className="font-semibold text-slate-900">Attendance</div>
                <div className="leading-6 text-slate-600">
                  Present: {event.attendanceSummary.present} · In voice: {event.attendanceSummary.inVoice} · Left: {event.attendanceSummary.left}
                </div>
                <div className="leading-6 text-slate-500">
                  Manual confirmations: {event.attendanceSummary.confirmed}
                </div>
              </div>
            </div>
          ) : null}

          {isAdmin && event.category === "PIT_BOSS" ? (
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <Coins size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <div className="font-semibold text-slate-900">Pit Boss bonus</div>
                <div className="leading-6 text-slate-600">
                  Linked warehouse items for this event occurrence: {linkedItemCount} · Total GP value: {formatGpValue(linkedTotalGp)}
                </div>
                <div className="leading-6 text-slate-500">
                  80% to participants: {formatGpValue(memberShareGp)} · 20% to guild: {formatGpValue(guildShareGp)}
                </div>
                {alreadyDistributed ? (
                  <div className="leading-6 text-emerald-600">
                    Distributed to {event.bonusDistribution?.participantCount ?? 0} participant{event.bonusDistribution?.participantCount === 1 ? "" : "s"}
                    {event.bonusDistribution?.perParticipantGp !== null && event.bonusDistribution?.perParticipantGp !== undefined
                      ? ` · ${formatGpValue(event.bonusDistribution.perParticipantGp)} each`
                      : ""}
                  </div>
                ) : (
                  <div className="leading-6 text-slate-500">
                    Eligible participants right now: {eligibleParticipants}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <UserRound size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">Attendance list</div>
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserRound size={14} />
                  <span>
                    View attendance
                    {event.attendees?.length ? ` (${event.attendees.length})` : ""}
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={isSendingReminder}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={14} />
                <span>{isSendingReminder ? "Sending..." : "Send reminder"}</span>
              </button>
              {event.category === "PIT_BOSS" ? (
                <button
                  type="button"
                  onClick={handleDistributeBonus}
                  disabled={
                    isDistributingBonus ||
                    alreadyDistributed ||
                    linkedTotalGp <= 0 ||
                    eligibleParticipants <= 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Coins size={14} />
                  <span>{isDistributingBonus ? "Distributing..." : "Distribute bonus"}</span>
                </button>
              ) : null}
            </div>
            {reminderFeedback ? (
              <div className="mt-2 text-xs font-medium text-slate-500">
                {reminderFeedback}
              </div>
            ) : null}
            {bonusFeedback ? (
              <div className="mt-2 text-xs font-medium text-slate-500">
                {bonusFeedback}
              </div>
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
      <AttendanceModal
        open={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        eventTitle={event.title}
        attendees={event.attendees ?? []}
      />
    </Popover>
  );
}

function CalendarToolbar({
  date,
  view,
  label,
}: ToolbarProps<CalendarEventRecord, object>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushState = (nextDate: Date, nextView: CalendarView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", formatDateKey(nextDate));
    params.set("view", nextView);
    params.delete("saved");
    params.delete("imported");
    params.delete("error");
    router.push(`${pathname}?${params.toString()}`);
  };

  const shiftDate = (direction: -1 | 1) => {
    const next = new Date(date);

    if (view === Views.DAY) {
      next.setDate(next.getDate() + direction);
    } else if (view === Views.MONTH) {
      next.setMonth(next.getMonth() + direction);
    } else {
      next.setDate(next.getDate() + 7 * direction);
    }

    pushState(next, view as CalendarView);
  };

  return (
    <div className="rf-calendar-toolbar">
      <div className="rf-calendar-toolbar-group">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="rf-calendar-nav-button"
          aria-label="Previous period"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => pushState(new Date(), view as CalendarView)}
          className="rf-calendar-today-button"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => shiftDate(1)}
          className="rf-calendar-nav-button"
          aria-label="Next period"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rf-calendar-toolbar-label">
        <CalendarDays size={18} />
        <span>{label}</span>
      </div>

      <div className="rf-calendar-toolbar-group rf-calendar-view-switcher">
        {[
          ["day", "Day"],
          ["week", "Week"],
          ["month", "Month"],
        ].map(([nextView, text]) => (
          <button
            key={nextView}
            type="button"
            onClick={() => pushState(date, nextView as CalendarView)}
            className={`rf-calendar-view-button ${view === nextView ? "is-active" : ""}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarHeader({ label, date }: { label: string; date: Date }) {
  const weekday = format(date, "EEE");
  const day = format(date, "d");

  if (label.includes(",")) {
    return <span className="rf-calendar-month-header">{label}</span>;
  }

  return (
    <div className="rf-calendar-header-cell">
      <span className="rf-calendar-header-weekday">{weekday}</span>
      <span className="rf-calendar-header-day">{day}</span>
    </div>
  );
}

export function EventsCalendar({
  events,
  selectedDate,
  view,
  isAdmin = false,
}: EventsCalendarProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const realtimeNow = new Date();
  const selectedBaseDate = new Date(`${selectedDate}T00:00:00`);
  const dayMin = new Date(
    selectedBaseDate.getFullYear(),
    selectedBaseDate.getMonth(),
    selectedBaseDate.getDate(),
    0,
    0,
    0,
    0,
  );
  const dayMax = new Date(
    selectedBaseDate.getFullYear(),
    selectedBaseDate.getMonth(),
    selectedBaseDate.getDate(),
    23,
    59,
    59,
    999,
  );
  const calendarNow = new Date(
    selectedBaseDate.getFullYear(),
    selectedBaseDate.getMonth(),
    selectedBaseDate.getDate(),
    realtimeNow.getHours(),
    realtimeNow.getMinutes(),
    0,
    0,
  );
  const scrollTarget = calendarNow;
  const isToday = true;

  useEffect(() => {
    if (!calendarRef.current || view === "month" || !isToday) return;

    let frameId = 0;
    let timeoutId = 0;

    const centerCurrentTime = () => {
      const timeContent = calendarRef.current?.querySelector(
        ".rbc-time-content",
      ) as HTMLElement | null;
      const indicator = calendarRef.current?.querySelector(
        ".rbc-current-time-indicator",
      ) as HTMLElement | null;

      if (!timeContent || !indicator) return false;

      const contentRect = timeContent.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      const indicatorOffset =
        indicatorRect.top - contentRect.top + timeContent.scrollTop;
      const maxScrollTop = Math.max(
        timeContent.scrollHeight - timeContent.clientHeight,
        0,
      );
      const targetScrollTop = Math.min(
        Math.max(indicatorOffset - timeContent.clientHeight / 2, 0),
        maxScrollTop,
      );

      timeContent.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });

      return true;
    };

    const attemptCenter = (retriesLeft: number) => {
      if (centerCurrentTime() || retriesLeft <= 0) return;

      frameId = window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => attemptCenter(retriesLeft - 1), 60);
      });
    };

    attemptCenter(12);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [isToday, selectedDate, view]);

  const calendarEvents: CalendarEventRecord[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    start: new Date(event.startAt),
    end: new Date(event.endAt),
    attendanceSummary: event.attendanceSummary,
    bonusDistribution: event.bonusDistribution,
    warehouseSummary: event.warehouseSummary,
    attendees: event.attendees,
  }));

  const components: Components<CalendarEventRecord, object> = {
    toolbar: CalendarToolbar,
    event: (props) => <EventCard {...props} isAdmin={isAdmin} />,
    header: CalendarHeader,
  };

  return (
    <div ref={calendarRef} className="rf-calendar-shell">
      <Calendar<CalendarEventRecord, object>
        localizer={localizer}
        date={new Date(`${selectedDate}T00:00:00`)}
        view={view}
        events={calendarEvents}
        views={["day", "week"]}
        components={components}
        startAccessor="start"
        endAccessor="end"
        popup
        selectable={false}
        toolbar
        showMultiDayTimes
        dayLayoutAlgorithm="no-overlap"
        step={60}
        timeslots={1}
        min={dayMin}
        max={dayMax}
        getNow={() => calendarNow}
        scrollToTime={scrollTarget}
        eventPropGetter={(event) => ({
          className: `rf-calendar-event ${getEventVariant((event as { category: CalendarEvent["category"] }).category)}`,
        })}
        formats={{
          timeGutterFormat: "h a",
          dayFormat: "EEE d",
          weekdayFormat: "EEE",
          dayHeaderFormat: "EEEE, MMM d",
          dayRangeHeaderFormat: ({ start, end }) =>
            `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
        }}
      />
    </div>
  );
}
