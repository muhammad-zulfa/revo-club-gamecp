import { NextResponse } from "next/server";
import { WarehouseItemStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { parseCurrencyUnit, parseWarehouseStatus } from "@/lib/warehouse";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const form = await req.formData();
  const status = parseWarehouseStatus(String(form.get("status") ?? ""));
  const soldAmountInput = String(form.get("soldAmount") ?? "").trim();
  const soldCurrency = parseCurrencyUnit(String(form.get("soldCurrency") ?? "").trim());
  const creditedAmountInput = String(form.get("creditedAmount") ?? "").trim();
  const creditedCurrency = parseCurrencyUnit(
    String(form.get("creditedCurrency") ?? "").trim(),
  );
  const soldTo = String(form.get("soldTo") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const soldAmount = soldAmountInput ? Number.parseFloat(soldAmountInput) : null;
  const creditedAmount = creditedAmountInput ? Number.parseFloat(creditedAmountInput) : null;

  if (!status) {
    return NextResponse.redirect(new URL("/warehouse?error=status", req.url), 303);
  }

  const isSoldStatus =
    status === WarehouseItemStatus.SOLD_EXTERNALLY ||
    status === WarehouseItemStatus.SOLD_TO_MEMBER;

  await prisma.warehouseItem.update({
    where: { id },
    data: {
      status,
      soldAmount,
      soldCurrency: soldAmount !== null ? soldCurrency : null,
      creditedAmount,
      creditedCurrency: creditedAmount !== null ? creditedCurrency : null,
      soldTo: soldTo || null,
      notes: notes || null,
      soldAt: isSoldStatus ? new Date() : null,
      creditedAt:
        status === WarehouseItemStatus.SOLD_EXTERNALLY && creditedAmount !== null
          ? new Date()
          : null,
    },
  });

  return NextResponse.redirect(new URL("/warehouse?updated=1", req.url), 303);
}
