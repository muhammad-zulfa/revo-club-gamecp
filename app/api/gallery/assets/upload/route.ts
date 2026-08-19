import { extname } from "node:path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { MAX_GALLERY_FILE_BYTES, parseGalleryAssetType } from "@/lib/gallery";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function saveGalleryAsset(folderId: string, file: File) {
  const extension = extname(file.name || "").toLowerCase() || "";
  const pathname = `gallery/${folderId}/${Date.now()}-${file.name || `upload${extension}`}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return blob.url;
}

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const folderId = String(form.get("folderId") ?? "").trim();
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!folderId || files.length === 0) {
    return NextResponse.redirect(new URL("/gallery?error=upload", req.url), 303);
  }

  const folder = await prisma.galleryFolder.findUnique({
    where: { id: folderId },
    select: { id: true },
  });

  if (!folder) {
    return NextResponse.redirect(new URL("/gallery?error=folderMissing", req.url), 303);
  }

  for (const file of files) {
    if (file.size > MAX_GALLERY_FILE_BYTES) {
      return NextResponse.redirect(new URL("/gallery?error=size", req.url), 303);
    }

    if (!parseGalleryAssetType(file.type)) {
      return NextResponse.redirect(new URL("/gallery?error=type", req.url), 303);
    }
  }

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const type = parseGalleryAssetType(file.type);

        if (!type) {
          throw new Error(`Unsupported gallery file type: ${file.type}`);
        }

        const url = await saveGalleryAsset(folderId, file);

        return {
          folderId,
          name: file.name || "upload",
          url,
          type,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          uploadedById: session.userId === "env-admin" ? null : session.userId,
        };
      }),
    );

    await prisma.galleryAsset.createMany({
      data: uploads,
    });
  } catch (error) {
    console.error("Gallery upload failed:", error);
    return NextResponse.redirect(new URL("/gallery?error=upload", req.url), 303);
  }

  return NextResponse.redirect(new URL(`/gallery?saved=upload&folder=${folderId}`, req.url), 303);
}
