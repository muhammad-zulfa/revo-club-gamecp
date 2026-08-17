import { authorizeCronRequest } from "@/lib/event-reminders";
import { refreshActiveEventAttendances } from "@/lib/event-attendance";

export const runtime = "nodejs";

async function handle(req: Request) {
  const authorized = await authorizeCronRequest(req);

  if (!authorized) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshActiveEventAttendances(new Date());
  return Response.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
