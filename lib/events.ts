import { EventCategory } from "@prisma/client";

export const eventRepeatOptions = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export type EventRepeatFrequency = (typeof eventRepeatOptions)[number]["value"];
export const MAX_RECURRING_EVENTS = 60;

export const eventCategoryOptions = [
  { value: EventCategory.PIT_BOSS, label: "Pit Boss" },
  { value: EventCategory.CHIP_WAR, label: "Chip War" },
  { value: EventCategory.GVG, label: "GvG" },
  { value: EventCategory.OTHER, label: "Other" },
] as const;

export function getEventCategoryLabel(category: EventCategory) {
  return eventCategoryOptions.find((option) => option.value === category)?.label ?? "Other";
}

export function getEventCategoryTone(category: EventCategory): "blue" | "green" | "amber" | "slate" {
  if (category === EventCategory.PIT_BOSS) return "blue";
  if (category === EventCategory.CHIP_WAR) return "amber";
  if (category === EventCategory.GVG) return "green";
  return "slate";
}

export function parseViewDate(input?: string) {
  const date = input ? new Date(`${input}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  next.setMilliseconds(-1);
  return next;
}

export function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 7);
  next.setMilliseconds(-1);
  return next;
}

export function startOfMonth(date: Date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

export function endOfMonth(date: Date) {
  const next = startOfMonth(date);
  next.setMonth(next.getMonth() + 1);
  next.setMilliseconds(-1);
  return next;
}

export function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getWeekDays(date: Date) {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + index);
    return next;
  });
}

export function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseDateTimeInputWithOffset(
  input: string,
  timezoneOffsetMinutes = 0,
) {
  const trimmed = input.trim();

  if (!trimmed) {
    return new Date(Number.NaN);
  }

  if (/z$/i.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[tT ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
  );

  if (!match) {
    return new Date(trimmed);
  }

  const [, year, month, day, hour, minute, second = "0", millisecond = "0"] = match;

  return new Date(
    Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10),
      Number.parseInt(millisecond.padEnd(3, "0"), 10),
    ) + timezoneOffsetMinutes * 60 * 1000,
  );
}

export function parseDateInputWithOffset(
  input: string,
  timezoneOffsetMinutes = 0,
  endOfDay = false,
) {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return new Date(trimmed);
  }

  const [, year, month, day] = match;
  const utcValue =
    Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ) + timezoneOffsetMinutes * 60 * 1000;

  return new Date(utcValue);
}

export function isEventRepeatFrequency(value: string): value is EventRepeatFrequency {
  return eventRepeatOptions.some((option) => option.value === value);
}

function addRecurringOffset(date: Date, frequency: Exclude<EventRepeatFrequency, "none">) {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (frequency === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export function buildRecurringDates(input: {
  startAt: Date;
  endAt: Date;
  repeat: EventRepeatFrequency;
  repeatUntil?: Date | null;
}) {
  const { startAt, endAt, repeat, repeatUntil } = input;

  if (repeat === "none") {
    return [{ startAt, endAt }];
  }

  if (!repeatUntil || Number.isNaN(repeatUntil.getTime())) {
    return null;
  }

  const until = new Date(repeatUntil);

  if (until.getTime() < startAt.getTime()) {
    return null;
  }

  const durationMs = endAt.getTime() - startAt.getTime();
  const instances = [{ startAt, endAt }];

  while (instances.length < MAX_RECURRING_EVENTS) {
    const previous = instances[instances.length - 1];
    const nextStart = addRecurringOffset(previous.startAt, repeat);

    if (nextStart.getTime() > until.getTime()) {
      break;
    }

    instances.push({
      startAt: nextStart,
      endAt: new Date(nextStart.getTime() + durationMs),
    });
  }

  return instances;
}
