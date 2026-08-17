import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.redirect(
    new URL(
      "/register?error=oauth&message=Use%20Discord%20registration%20instead%20of%20the%20manual%20form.",
      req.url,
    ),
    303,
  );
}
