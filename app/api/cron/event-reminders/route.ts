import { NextResponse } from "next/server";
import { authorizeCronRequest, dispatchDueEventReminders } from "@/lib/event-reminders";

export const runtime = "nodejs";

async function handle(req: Request) {
  const authorized = await authorizeCronRequest(req);

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await dispatchDueEventReminders(new Date());
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
