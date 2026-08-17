import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Options = {
  apply: boolean;
  shiftMinutes: number;
  from?: Date;
  to?: Date;
  ids: string[];
};

function parseArgs(argv: string[]): Options {
  let apply = false;
  let shiftMinutes: number | null = null;
  let from: Date | undefined;
  let to: Date | undefined;
  let ids: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--shift-minutes") {
      const value = argv[index + 1];
      index += 1;
      shiftMinutes = Number.parseInt(value ?? "", 10);
      continue;
    }

    if (arg === "--from") {
      const value = argv[index + 1];
      index += 1;
      from = value ? new Date(value) : undefined;
      continue;
    }

    if (arg === "--to") {
      const value = argv[index + 1];
      index += 1;
      to = value ? new Date(value) : undefined;
      continue;
    }

    if (arg === "--ids") {
      const value = argv[index + 1] ?? "";
      index += 1;
      ids = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }

  if (!Number.isFinite(shiftMinutes)) {
    throw new Error("Missing required --shift-minutes value.");
  }

  if (from && Number.isNaN(from.getTime())) {
    throw new Error("Invalid --from date.");
  }

  if (to && Number.isNaN(to.getTime())) {
    throw new Error("Invalid --to date.");
  }

  return {
    apply,
    shiftMinutes: shiftMinutes as number,
    from,
    to,
    ids,
  };
}

function shiftDate(date: Date, shiftMinutes: number) {
  return new Date(date.getTime() + shiftMinutes * 60 * 1000);
}

function describeOptions(options: Options) {
  return {
    mode: options.apply ? "apply" : "dry-run",
    shiftMinutes: options.shiftMinutes,
    from: options.from?.toISOString() ?? null,
    to: options.to?.toISOString() ?? null,
    ids: options.ids,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const events = await prisma.event.findMany({
    where: {
      ...(options.ids.length ? { id: { in: options.ids } } : {}),
      ...(
        options.from || options.to
          ? {
              startAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}
      ),
    },
    include: {
      reminders: {
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
    orderBy: {
      startAt: "asc",
    },
  });

  console.log("Repair options:", JSON.stringify(describeOptions(options), null, 2));
  console.log(`Matched ${events.length} event(s).`);

  if (!events.length) {
    return;
  }

  for (const event of events) {
    const nextStartAt = shiftDate(event.startAt, options.shiftMinutes);
    const nextEndAt = shiftDate(event.endAt, options.shiftMinutes);

    console.log(
      [
        `- ${event.id}`,
        `"${event.title}"`,
        `${event.startAt.toISOString()} -> ${nextStartAt.toISOString()}`,
        `${event.endAt.toISOString()} -> ${nextEndAt.toISOString()}`,
      ].join(" | "),
    );

    for (const reminder of event.reminders) {
      if (reminder.sentAt) {
        console.log(
          `  reminder ${reminder.id} already sent at ${reminder.sentAt.toISOString()} - leaving scheduledAt unchanged`,
        );
        continue;
      }

      const nextScheduledAt = shiftDate(reminder.scheduledAt, options.shiftMinutes);
      console.log(
        `  reminder ${reminder.id} (${reminder.minutesOffset}m): ${reminder.scheduledAt.toISOString()} -> ${nextScheduledAt.toISOString()}`,
      );
    }
  }

  if (!options.apply) {
    console.log("Dry run only. Re-run with --apply to write changes.");
    return;
  }

  const updates: Prisma.PrismaPromise<unknown>[] = events.flatMap((event) => {
      const eventUpdates: Prisma.PrismaPromise<unknown>[] = [
        prisma.event.update({
          where: { id: event.id },
          data: {
            startAt: shiftDate(event.startAt, options.shiftMinutes),
            endAt: shiftDate(event.endAt, options.shiftMinutes),
          },
        }),
      ];

      for (const reminder of event.reminders) {
        if (reminder.sentAt) continue;

        eventUpdates.push(
          prisma.eventReminder.update({
            where: { id: reminder.id },
            data: {
              scheduledAt: shiftDate(reminder.scheduledAt, options.shiftMinutes),
            },
          }),
        );
      }

      return eventUpdates;
    });

  await prisma.$transaction(updates);

  console.log("Repair complete.");
}

main()
  .catch((error) => {
    console.error("Repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
