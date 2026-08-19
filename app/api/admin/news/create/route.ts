import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendDiscordNewsNotification } from "@/lib/discord";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const eventId = String(form.get("eventId") ?? "").trim();
  const tagAll = String(form.get("tagAll") ?? "") === "on";
  const recipientIds = form
    .getAll("recipientIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const folderIds = form
    .getAll("folderIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const assetIds = form
    .getAll("assetIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!title || !content) {
    return NextResponse.redirect(new URL("/news?error=missing", req.url), 303);
  }

  if (!tagAll && recipientIds.length === 0) {
    return NextResponse.redirect(new URL("/news?error=recipients", req.url), 303);
  }

  const uniqueRecipientIds = [...new Set(recipientIds)];
  const uniqueFolderIds = [...new Set(folderIds)];
  const uniqueAssetIds = [...new Set(assetIds)];

  try {
    const news = await prisma.$transaction(async (tx) => {
      const created = await tx.news.create({
        data: {
          title,
          content,
          tagAll,
          eventId: eventId || null,
          createdById: admin.userId === "env-admin" ? null : admin.userId,
          recipients: uniqueRecipientIds.length
            ? {
                createMany: {
                  data: uniqueRecipientIds.map((userId) => ({ userId })),
                },
              }
            : undefined,
          folderAttachments: uniqueFolderIds.length
            ? {
                createMany: {
                  data: uniqueFolderIds.map((folderId) => ({ folderId })),
                },
              }
            : undefined,
          assetAttachments: uniqueAssetIds.length
            ? {
                createMany: {
                  data: uniqueAssetIds.map((assetId) => ({ assetId })),
                },
              }
            : undefined,
        },
        include: {
          event: {
            select: {
              title: true,
              startAt: true,
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
          },
          folderAttachments: {
            include: {
              folder: {
                include: {
                  assets: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
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
          },
        },
      });

      await tx.activityLog.create({
        data: {
          type: "news.created",
          title: `News posted: ${created.title}`,
          detail: tagAll
            ? "Audience: all members"
            : `Audience: ${created.recipients.length} member${created.recipients.length === 1 ? "" : "s"}`,
        },
      }).catch(() => null);

      return created;
    });

    try {
      const sent = await sendDiscordNewsNotification({
        title: news.title,
        content: news.content,
        tagAll: news.tagAll,
        recipients: news.recipients.map((recipient) => recipient.user),
        linkedEvent: news.event
          ? {
              title: news.event.title,
              startAt: news.event.startAt,
            }
          : null,
        galleryFolders: news.folderAttachments.map((attachment) => ({
          id: attachment.folder.id,
          name: attachment.folder.name,
          assetCount: attachment.folder.assets.length,
        })),
        galleryAssets: news.assetAttachments.map((attachment) => ({
          id: attachment.asset.id,
          name: attachment.asset.name,
          url: attachment.asset.url,
          folderName: attachment.asset.folder?.name ?? null,
        })),
        createdBy: admin.name,
      });

      return NextResponse.redirect(new URL(`/news?saved=1&discord=${sent ? "sent" : "skipped"}`, req.url), 303);
    } catch (error) {
      console.error("Discord news notification failed:", error);
      return NextResponse.redirect(new URL("/news?saved=1&discord=failed", req.url), 303);
    }
  } catch (error) {
    console.error("News creation failed:", error);
    return NextResponse.redirect(new URL("/news?error=missing", req.url), 303);
  }
}
