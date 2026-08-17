import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { WarehouseItemSource } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { parseCurrencyUnit, parseWarehouseSource } from "@/lib/warehouse";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function saveWarehouseImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = extname(file.name || "").toLowerCase() || ".png";
  const filename = `${randomUUID()}${extension}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "warehouse");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), bytes);
  return `/uploads/warehouse/${filename}`;
}

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const imageUrlInput = String(form.get("imageUrl") ?? "").trim();
  const imageFile = form.get("imageFile");
  const askingPrice = Number.parseFloat(String(form.get("askingPrice") ?? ""));
  const askingPriceCurrency = parseCurrencyUnit(
    String(form.get("askingPriceCurrency") ?? "").trim(),
  );
  const source = parseWarehouseSource(String(form.get("source") ?? ""));
  const eventId = String(form.get("eventId") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();

  if (
    !name ||
    !Number.isFinite(askingPrice) ||
    askingPrice < 0 ||
    !askingPriceCurrency ||
    !source
  ) {
    return NextResponse.redirect(new URL("/warehouse?error=missing", req.url), 303);
  }

  if (source === WarehouseItemSource.PIT_BOSS && !eventId) {
    return NextResponse.redirect(new URL("/warehouse?error=event", req.url), 303);
  }

  let imageUrl = imageUrlInput;

  if (!imageUrl && imageFile instanceof File && imageFile.size > 0) {
    imageUrl = await saveWarehouseImage(imageFile);
  }

  if (!imageUrl) {
    return NextResponse.redirect(new URL("/warehouse?error=image", req.url), 303);
  }

  await prisma.warehouseItem.create({
    data: {
      name,
      imageUrl,
      askingPrice,
      askingPriceCurrency,
      source,
      eventId: source === WarehouseItemSource.PIT_BOSS ? eventId : null,
      notes: notes || null,
      sellerName: source === WarehouseItemSource.GUILD_SELLER ? session.name : null,
      createdById: session.userId === "env-admin" ? null : session.userId,
    },
  });

  return NextResponse.redirect(new URL("/warehouse?saved=1", req.url), 303);
}
