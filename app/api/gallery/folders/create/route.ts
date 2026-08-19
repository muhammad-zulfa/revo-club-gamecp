import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (!name) {
    return NextResponse.redirect(new URL("/gallery?error=folder", req.url), 303);
  }

  try {
    await prisma.galleryFolder.create({
      data: {
        name,
        description: description || null,
        createdById: session.userId === "env-admin" ? null : session.userId,
      },
    });
  } catch (error) {
    console.error("Gallery folder creation failed:", error);
    return NextResponse.redirect(new URL("/gallery?error=folder", req.url), 303);
  }

  return NextResponse.redirect(new URL("/gallery?saved=folder", req.url), 303);
}
