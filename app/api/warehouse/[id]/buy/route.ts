import { ApprovalStatus, CurrencyUnit, GpLedgerEntryType, WarehouseItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendDiscordGuildTradeNotification } from "@/lib/discord";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const form = await req.formData();
  const redirectTo = String(form.get("redirectTo") ?? "/warehouse").trim() || "/warehouse";

  try {
    const [user, item, config] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          name: true,
          gpBalance: true,
          approvalStatus: true,
          discordId: true,
          discordHandle: true,
        },
      }),
      prisma.warehouseItem.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          source: true,
          askingPrice: true,
          askingPriceCurrency: true,
          event: {
            select: {
              title: true,
              startAt: true,
            },
          },
        },
      }),
      prisma.appConfig.findUnique({
        where: { id: "default" },
        select: {
          warehouseMemberSaleFeePercent: true,
        },
      }),
    ]);

    if (!user || user.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new Error("balance");
    }

    if (!item) {
      throw new Error("item");
    }

    if (item.askingPriceCurrency !== CurrencyUnit.GP) {
      throw new Error("currency");
    }

    if (item.status !== WarehouseItemStatus.STORED && item.status !== WarehouseItemStatus.LISTED) {
      throw new Error("item");
    }

    if (user.gpBalance < item.askingPrice) {
      throw new Error("balance");
    }

    const feePercent = Math.min(
      100,
      Math.max(0, config?.warehouseMemberSaleFeePercent ?? 0),
    );
    const guildFeeGp =
      item.source === "GUILD_SELLER" ? (item.askingPrice * feePercent) / 100 : 0;
    const soldAt = new Date();

    const result = await prisma.$transaction([
      prisma.user.updateMany({
        where: {
          id: user.id,
          approvalStatus: ApprovalStatus.APPROVED,
          gpBalance: {
            gte: item.askingPrice,
          },
        },
        data: {
          gpBalance: { decrement: item.askingPrice },
        },
      }),
      prisma.warehouseItem.updateMany({
        where: {
          id: item.id,
          status: { in: [WarehouseItemStatus.STORED, WarehouseItemStatus.LISTED] },
        },
        data: {
          status: WarehouseItemStatus.SOLD_TO_MEMBER,
          soldTo: user.name,
          soldAmount: item.askingPrice,
          soldCurrency: CurrencyUnit.GP,
          soldAt,
          creditedAmount: guildFeeGp > 0 ? guildFeeGp : null,
          creditedCurrency: guildFeeGp > 0 ? CurrencyUnit.GP : null,
          creditedAt: guildFeeGp > 0 ? soldAt : null,
        },
      }),
      prisma.gpLedgerEntry.create({
        data: {
          userId: user.id,
          type: GpLedgerEntryType.WAREHOUSE_PURCHASE,
          amount: -item.askingPrice,
          note: `Purchased ${item.name} from the warehouse`,
          warehouseItemId: item.id,
        },
      }),
      ...(guildFeeGp > 0
        ? [
            prisma.appConfig.upsert({
              where: { id: "default" },
              update: {
                guildGpBalance: {
                  increment: guildFeeGp,
                },
              },
              create: {
                id: "default",
                guildGpBalance: guildFeeGp,
              },
            }),
          ]
        : []),
    ]);

    if ((result[0] as { count: number }).count !== 1 || (result[1] as { count: number }).count !== 1) {
      throw new Error("item");
    }

    const purchase = {
      itemName: item.name,
      soldAmountGp: item.askingPrice,
      buyerName: user.name,
      buyerDiscordId: user.discordId,
      buyerDiscordHandle: user.discordHandle,
      linkedEventTitle: item.event?.title ?? null,
      linkedEventStartAt: item.event?.startAt ?? null,
    };

    await sendDiscordGuildTradeNotification(purchase).catch((error) => {
      console.error("Discord guild trade notification failed:", error);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "item";
    const code = message === "balance" || message === "item" || message === "currency" ? message : "item";
    return NextResponse.redirect(new URL(`${redirectTo}?error=${code}`, req.url), 303);
  }

  return NextResponse.redirect(new URL(`${redirectTo}?bought=1`, req.url), 303);
}
