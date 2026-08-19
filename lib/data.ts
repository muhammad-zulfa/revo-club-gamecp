import { prisma } from "@/lib/prisma";
import {
  ApprovalStatus,
  CurrencyUnit,
  EventCategory,
  GpLedgerEntryType,
  WarehouseItemSource,
  WarehouseItemStatus,
} from "@prisma/client";
import { fallbackMembers } from "@/lib/mock";

export async function getMembers() {
  try {
    const members = await prisma.guildMember.findMany({ orderBy: [{ isOnline: "desc" }, { level: "desc" }] });
    return members.length ? members : fallbackMembers;
  } catch {
    return fallbackMembers;
  }
}

export async function getGuildProfile() {
  try {
    const guild = await prisma.guild.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (guild) {
      return guild;
    }
  } catch {}

  return {
    id: "fallback-guild",
    name: "Brave Fox",
    worldName: "RF Default Fresh",
    race: "ACCRETIA",
    description: "Standalone guild CRM demo",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getActivities() {
  try {
    const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
    if (rows.length) return rows;
  } catch {}
  return [
    { id: "a", title: "Kenzaki is online", detail: "Brave Fox", createdAt: new Date() },
    { id: "b", title: "Lunaris joined the guild", detail: "Trial member", createdAt: new Date(Date.now() - 3600000) },
    { id: "c", title: "Guild profile updated", detail: "Description changed", createdAt: new Date(Date.now() - 7200000) }
  ];
}

export async function getNewsFeed() {
  try {
    return await prisma.news.findMany({
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                discordHandle: true,
                discordId: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        folderAttachments: {
          include: {
            folder: {
              include: {
                assets: {
                  select: {
                    id: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        assetAttachments: {
          include: {
            asset: {
              include: {
                folder: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function getNewsTaggableUsers() {
  try {
    return await prisma.user.findMany({
      where: {
        approvalStatus: ApprovalStatus.APPROVED,
      },
      select: {
        id: true,
        name: true,
        discordHandle: true,
        discordId: true,
      },
      orderBy: [{ name: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getEventsForNewsLinking() {
  try {
    return await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        startAt: true,
      },
      orderBy: [{ startAt: "desc" }],
      take: 80,
    });
  } catch {
    return [];
  }
}

export async function getGalleryFolders() {
  try {
    return await prisma.galleryFolder.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        assets: {
          orderBy: [{ createdAt: "desc" }],
          take: 12,
        },
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function getGalleryFoldersForNewsAttachment() {
  try {
    return await prisma.galleryFolder.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 60,
    });
  } catch {
    return [];
  }
}

export async function getGalleryAssetsForNewsAttachment() {
  try {
    return await prisma.galleryAsset.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
    });
  } catch {
    return [];
  }
}

export async function getEventsInRange(startAt: Date, endAt: Date) {
  try {
    const events = await prisma.event.findMany({
      where: {
        startAt: { gte: startAt },
        endAt: { lte: endAt }
      },
      include: {
        warehouseItems: {
          select: {
            id: true,
            name: true,
            askingPrice: true,
            askingPriceCurrency: true,
            status: true,
          },
        },
        attendees: {
          select: {
            userId: true,
            discordId: true,
            discordHandle: true,
            status: true,
            totalSecondsInVoice: true,
            firstJoinedAt: true,
            lastLeftAt: true,
            qualifiedAt: true,
            confirmedAt: true,
            proofNote: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ firstJoinedAt: "asc" }],
        },
      },
      orderBy: [{ startAt: "asc" }]
    });

    const discordIds = [...new Set(
      events.flatMap((event) => event.attendees.map((attendance) => attendance.discordId)),
    )];

    const usersByDiscordId = discordIds.length
      ? new Map(
          (
            await prisma.user.findMany({
              where: {
                discordId: { in: discordIds },
              },
              select: {
                id: true,
                name: true,
                discordId: true,
              },
            })
          ).map((user) => [user.discordId, user]),
        )
      : new Map<string | null, { id: string; name: string; discordId: string | null }>();

    return events.map((event) => ({
      ...event,
      attendees: event.attendees.map((attendance) => {
        const linkedUser = attendance.user ?? usersByDiscordId.get(attendance.discordId) ?? null;

        return {
          ...attendance,
          userId: attendance.userId ?? linkedUser?.id ?? null,
          user: linkedUser
            ? {
                id: linkedUser.id,
                name: linkedUser.name,
              }
            : attendance.user,
        };
      }),
    }));
  } catch {
    const base = new Date(startAt);
    base.setHours(19, 0, 0, 0);

    return [
      {
        id: "e1",
        title: "Ether Pit Rotation",
        description: "Bellato side sweep and callouts in Discord.",
        category: EventCategory.PIT_BOSS,
        startAt: new Date(base),
        endAt: new Date(base.getTime() + 60 * 60 * 1000),
        attendanceMinutesRequired: 10,
        bonusDistributedAt: null,
        bonusParticipantCount: null,
        bonusTotalGp: null,
        bonusGuildShareGp: null,
        bonusPerParticipantGp: null,
        warehouseItems: [],
        attendees: [],
      },
      {
        id: "e2",
        title: "Chip War Rally",
        description: "All online members join 15 minutes early.",
        category: EventCategory.CHIP_WAR,
        startAt: new Date(base.getTime() + 24 * 60 * 60 * 1000),
        endAt: new Date(base.getTime() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        attendanceMinutesRequired: 10,
        bonusDistributedAt: null,
        bonusParticipantCount: null,
        bonusTotalGp: null,
        bonusGuildShareGp: null,
        bonusPerParticipantGp: null,
        warehouseItems: [],
        attendees: [],
      }
    ];
  }
}

export async function getPitBossEventsForWarehouse() {
  try {
    return await prisma.event.findMany({
      where: {
        category: EventCategory.PIT_BOSS,
      },
      select: {
        id: true,
        title: true,
        startAt: true,
      },
      orderBy: [{ startAt: "desc" }],
      take: 50,
    });
  } catch {
    return [];
  }
}

export async function getWarehouseItems() {
  try {
    return await prisma.warehouseItem.findMany({
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch {
    return [
      {
        id: "warehouse-fallback-1",
        name: "Heroic PB Core",
        imageUrl: "https://placehold.co/600x400/e8eefb/1e293b?text=PB+Core",
        askingPrice: 2500000,
        askingPriceCurrency: CurrencyUnit.GP,
        source: WarehouseItemSource.PIT_BOSS,
        status: WarehouseItemStatus.STORED,
        notes: "Saved from the latest Pit Boss rotation.",
        sellerName: null,
        soldTo: null,
        soldAmount: null,
        soldCurrency: null,
        creditedAmount: null,
        creditedCurrency: null,
        soldAt: null,
        creditedAt: null,
        eventId: null,
        event: null,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}

export async function getWarehouseSummary() {
  try {
    const items = await prisma.warehouseItem.findMany({
      select: {
        status: true,
        source: true,
      },
    });

    return {
      totalItems: items.length,
      pbItems: items.filter((item) => item.source === WarehouseItemSource.PIT_BOSS).length,
      externallySold: items.filter((item) => item.status === WarehouseItemStatus.SOLD_EXTERNALLY).length,
      listedItems: items.filter((item) => item.status === WarehouseItemStatus.LISTED).length,
    };
  } catch {
    return {
      totalItems: 1,
      pbItems: 1,
      externallySold: 0,
      listedItems: 0,
    };
  }
}

export async function getGuildCashSummary() {
  try {
    const [items, config] = await Promise.all([
      prisma.warehouseItem.findMany({
        select: {
          name: true,
          status: true,
          soldAmount: true,
          soldCurrency: true,
          creditedAmount: true,
          creditedCurrency: true,
          creditedAt: true,
          soldAt: true,
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.appConfig.findUnique({
        where: { id: "default" },
        select: { guildGpBalance: true },
      }),
    ]);

    const idr = items
      .filter((item) => item.creditedCurrency === CurrencyUnit.IDR)
      .reduce((sum, item) => sum + (item.creditedAmount ?? 0), 0);
    const cashCoin = items
      .filter((item) => item.creditedCurrency === CurrencyUnit.CASH_COIN)
      .reduce((sum, item) => sum + (item.creditedAmount ?? 0), 0);
    const gpDistributed = items
      .filter(
        (item) =>
          item.status === WarehouseItemStatus.SOLD_TO_MEMBER &&
          item.soldCurrency === CurrencyUnit.GP,
      )
      .reduce((sum, item) => sum + (item.soldAmount ?? 0), 0);

    return {
      idr,
      cashCoin,
      guildGpBalance: config?.guildGpBalance ?? 0,
      gpDistributed,
      entries: items.filter(
        (item) =>
          item.creditedAmount !== null ||
          (item.status === WarehouseItemStatus.SOLD_TO_MEMBER &&
            item.soldCurrency === CurrencyUnit.GP &&
            item.soldAmount !== null),
      ),
    };
  } catch {
    return {
      idr: 0,
      cashCoin: 0,
      guildGpBalance: 0,
      gpDistributed: 0,
      entries: [],
    };
  }
}

export async function getUserGpBalance(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        gpBalance: true,
      },
    });

    return user?.gpBalance ?? 0;
  } catch {
    return 0;
  }
}

export async function getGpTransferRecipients(currentUserId: string) {
  try {
    return await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        approvalStatus: ApprovalStatus.APPROVED,
      },
      select: {
        id: true,
        name: true,
        discordHandle: true,
        gpBalance: true,
      },
      orderBy: [{ name: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getGpWallet(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        gpBalance: true,
        gpLedgerEntries: {
          include: {
            relatedUser: {
              select: {
                id: true,
                name: true,
                discordHandle: true,
              },
            },
            warehouseItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 20,
        },
      },
    });
  } catch {
    return null;
  }
}

export function getGpLedgerLabel(type: GpLedgerEntryType) {
  if (type === GpLedgerEntryType.TRANSFER_SENT) return "Transfer sent";
  if (type === GpLedgerEntryType.TRANSFER_RECEIVED) return "Transfer received";
  if (type === GpLedgerEntryType.WAREHOUSE_PURCHASE) return "Warehouse purchase";
  return "Admin adjustment";
}
