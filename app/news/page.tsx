import Link from "next/link";
import { redirect } from "next/navigation";
import { Film, FolderOpen, ImageIcon, Link2, Megaphone, Plus, X } from "lucide-react";
import { UserRole } from "@prisma/client";
import { Shell } from "@/components/shell";
import { Badge, Card } from "@/components/ui";
import { getSession } from "@/lib/auth";
import {
  getEventsForNewsLinking,
  getGalleryAssetsForNewsAttachment,
  getGalleryFoldersForNewsAttachment,
  getNewsFeed,
  getNewsTaggableUsers,
} from "@/lib/data";

function formatNewsDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    discord?: string;
    error?: string;
    panel?: string;
  }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [params, feed, taggableUsers, events, galleryFolders, galleryAssets] = await Promise.all([
    searchParams,
    getNewsFeed(),
    getNewsTaggableUsers(),
    getEventsForNewsLinking(),
    getGalleryFoldersForNewsAttachment(),
    getGalleryAssetsForNewsAttachment(),
  ]);

  const isAdmin = session.role === UserRole.ADMIN;
  const panel = isAdmin && params.panel === "create" ? "create" : null;

  const feedbackMessage =
    params.saved === "1" && params.discord === "sent"
      ? "News posted and sent to Discord."
      : params.saved === "1" && params.discord === "skipped"
        ? "News posted. Discord send was skipped because the news channel or bot is not configured."
        : params.saved === "1" && params.discord === "failed"
          ? "News posted, but the Discord send failed."
          : params.saved === "1"
            ? "News posted."
            : params.error === "missing"
              ? "Fill in the title and content before posting news."
              : params.error === "recipients"
                ? "Choose at least one related member or enable the all-members option."
                : undefined;

  return (
    <Shell
      active="/news"
      title="News"
      subtitle="Guild announcements, information updates, and member-related notices."
      action={
        isAdmin ? (
          <Link
            href="/news?panel=create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Create news</span>
          </Link>
        ) : null
      }
    >
      <div className={`grid gap-6 ${panel ? "xl:grid-cols-[1.45fr_.95fr]" : ""}`}>
        <div className="space-y-6">
          {feedbackMessage ? (
            <Card className={`p-4 ${params.error ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className={`text-sm font-semibold ${params.error ? "text-amber-700" : "text-emerald-700"}`}>
                {feedbackMessage}
              </div>
            </Card>
          ) : null}

          {feed.length ? (
            <div className="grid gap-4">
              {feed.map((news) => (
                <Card key={news.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold text-slate-900">{news.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Posted {formatNewsDate(news.createdAt)}
                        {news.createdBy ? ` · by ${news.createdBy.name}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {news.tagAll ? <Badge tone="blue">All members</Badge> : null}
                      {news.event ? <Badge tone="amber">Linked event</Badge> : null}
                      {news.folderAttachments.length ? <Badge tone="slate">{news.folderAttachments.length} folder{news.folderAttachments.length === 1 ? "" : "s"}</Badge> : null}
                      {news.assetAttachments.length ? <Badge tone="slate">{news.assetAttachments.length} file{news.assetAttachments.length === 1 ? "" : "s"}</Badge> : null}
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {news.content}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Tagged members</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {news.tagAll ? (
                          <Badge tone="blue">All guild members</Badge>
                        ) : news.recipients.length ? (
                          news.recipients.map((recipient) => (
                            <Badge key={recipient.id} tone="slate">
                              {recipient.user.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">No tagged members</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Linked event</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {news.event ? `${news.event.title} · ${formatNewsDate(news.event.startAt)}` : "No linked event"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Attached folders</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {news.folderAttachments.length ? (
                          news.folderAttachments.map((attachment) => (
                            <Link
                              key={attachment.id}
                              href={`/gallery?folder=${attachment.folder.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
                            >
                              <FolderOpen size={14} />
                              <span>{attachment.folder.name}</span>
                              <span className="text-slate-400">({attachment.folder.assets.length})</span>
                            </Link>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">No folders attached</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Attached files</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {news.assetAttachments.length ? (
                          news.assetAttachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
                            >
                              {attachment.asset.type === "IMAGE" ? <ImageIcon size={14} /> : <Film size={14} />}
                              <span>{attachment.asset.name}</span>
                            </a>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">No files attached</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="px-6 py-12 text-center text-sm text-slate-500">
              No news posted yet.
            </Card>
          )}
        </div>

        {panel ? (
          <div className="min-h-0">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Megaphone size={18} />
                  <span>Create news</span>
                </div>
                <Link
                  href="/news"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X size={16} />
                </Link>
              </div>

              <form action="/api/admin/news/create" method="post" className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Title</span>
                  <input
                    name="title"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Content</span>
                  <textarea
                    name="content"
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Linked event</span>
                  <select
                    name="eventId"
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">No linked event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} · {formatNewsDate(event.startAt)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="tagAll"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>Tag all guild members</span>
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Related members</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Choose the specific members related to this news item. Ignored if all members is enabled.
                  </div>
                  <div className="mt-4 grid max-h-64 gap-3 overflow-y-auto md:grid-cols-2">
                    {taggableUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      >
                        <input type="checkbox" name="recipientIds" value={user.id} className="h-4 w-4 rounded border-slate-300" />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{user.name}</div>
                          <div className="truncate text-xs text-slate-400">@{user.discordHandle}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Attach gallery folders</div>
                      <div className="mt-1 text-xs text-slate-400">
                        These folders will be referenced in the news post and the Discord notification.
                      </div>
                    </div>
                    <Link href="/gallery?panel=create" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      <Link2 size={14} />
                      <span>Open gallery</span>
                    </Link>
                  </div>
                  <div className="mt-4 grid max-h-48 gap-3 overflow-y-auto md:grid-cols-2">
                    {galleryFolders.map((folder) => (
                      <label
                        key={folder.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      >
                        <input type="checkbox" name="folderIds" value={folder.id} className="h-4 w-4 rounded border-slate-300" />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{folder.name}</div>
                          <div className="truncate text-xs text-slate-400">{folder._count.assets} file{folder._count.assets === 1 ? "" : "s"}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Attach individual media</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Add specific files when you do not want to attach the whole folder.
                  </div>
                  <div className="mt-4 grid max-h-56 gap-3 overflow-y-auto md:grid-cols-2">
                    {galleryAssets.map((asset) => (
                      <label
                        key={asset.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      >
                        <input type="checkbox" name="assetIds" value={asset.id} className="h-4 w-4 rounded border-slate-300" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate font-medium text-slate-900">
                            {asset.type === "IMAGE" ? <ImageIcon size={14} /> : <Film size={14} />}
                            <span className="truncate">{asset.name}</span>
                          </div>
                          <div className="truncate text-xs text-slate-400">{asset.folder.name}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
                  Post news
                </button>
              </form>
            </Card>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
