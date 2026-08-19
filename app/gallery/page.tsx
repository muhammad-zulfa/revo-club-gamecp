import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderPlus, Film, ImageIcon, Link2, Plus, Upload } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Card } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getGalleryFolders } from "@/lib/data";
import { formatGalleryFileSize, MAX_GALLERY_FILE_BYTES } from "@/lib/gallery";

function formatGalleryDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; panel?: string; folder?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [params, folders] = await Promise.all([searchParams, getGalleryFolders()]);
  const panel = params.panel === "create" ? "create" : null;
  const feedbackMessage =
    params.saved === "folder"
      ? "Gallery folder created."
      : params.saved === "upload"
        ? "Gallery files uploaded."
        : params.error === "folder"
          ? "Enter a unique folder name before saving."
          : params.error === "folderMissing"
            ? "Choose a valid gallery folder before uploading."
            : params.error === "size"
              ? "Each uploaded file must be 10 MB or smaller."
              : params.error === "type"
                ? "Gallery only accepts image and video files."
                : params.error === "upload"
                  ? "Upload failed. Check Blob storage and try again."
                  : undefined;

  return (
    <Shell
      active="/gallery"
      title="Gallery"
      subtitle="Store guild screenshots and clips inside folders, then reuse them in news posts."
      action={(
        <Link
          href="/gallery?panel=create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>Manage gallery</span>
        </Link>
      )}
    >
      <div className={`grid gap-6 ${panel ? "xl:grid-cols-[1.35fr_.95fr]" : ""}`}>
        <div className="space-y-6">
          {feedbackMessage ? (
            <Card className={`p-4 ${params.error ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className={`text-sm font-semibold ${params.error ? "text-amber-700" : "text-emerald-700"}`}>
                {feedbackMessage}
              </div>
            </Card>
          ) : null}

          {folders.length ? (
            <div className="grid gap-4">
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className={`p-6 ${params.folder === folder.id ? "border-blue-300 shadow-[0_0_0_1px_rgba(37,99,235,.25)]" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold text-slate-900">{folder.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Created {formatGalleryDate(folder.createdAt)}
                        {folder.createdBy ? ` · by ${folder.createdBy.name}` : ""}
                      </div>
                    </div>
                    <Badge tone="blue">{folder._count.assets} file{folder._count.assets === 1 ? "" : "s"}</Badge>
                  </div>

                  {folder.description ? (
                    <div className="mt-4 text-sm leading-7 text-slate-600">
                      {folder.description}
                    </div>
                  ) : null}

                  {folder.assets.length ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {folder.assets.map((asset) => (
                        <a
                          key={asset.id}
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-blue-300 hover:bg-white"
                        >
                          <div className="aspect-[4/3] bg-slate-100">
                            {asset.type === "IMAGE" ? (
                              <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                            ) : (
                              <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                            )}
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              {asset.type === "IMAGE" ? <ImageIcon size={15} /> : <Film size={15} />}
                              <span className="truncate">{asset.name}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {formatGalleryFileSize(asset.sizeBytes)} · {formatGalleryDate(asset.createdAt)}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                      No uploads in this folder yet.
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="px-6 py-12 text-center text-sm text-slate-500">
              No gallery folders yet.
            </Card>
          )}
        </div>

        {panel ? (
          <div className="min-h-0 space-y-6">
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <FolderPlus size={18} />
                <span>Create folder</span>
              </div>

              <form action="/api/gallery/folders/create" method="post" className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Folder name</span>
                  <input
                    name="name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Description</span>
                  <textarea
                    name="description"
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
                  Save folder
                </button>
              </form>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Upload size={18} />
                <span>Upload media</span>
              </div>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Upload images or videos only. Maximum file size is {formatGalleryFileSize(MAX_GALLERY_FILE_BYTES)} per file.
              </div>

              <form action="/api/gallery/assets/upload" method="post" encType="multipart/form-data" className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Target folder</span>
                  <select
                    name="folderId"
                    defaultValue={params.folder ?? ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select a folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Image or video files</span>
                  <input
                    type="file"
                    name="files"
                    accept="image/*,video/*"
                    multiple
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold"
                  />
                </label>
                <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
                  Upload to folder
                </button>
              </form>
            </Card>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
