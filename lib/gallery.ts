import { GalleryAssetType } from "@prisma/client";

export const MAX_GALLERY_FILE_BYTES = 10 * 1024 * 1024;

export function formatGalleryFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

export function parseGalleryAssetType(mimeType: string) {
  if (mimeType.startsWith("image/")) return GalleryAssetType.IMAGE;
  if (mimeType.startsWith("video/")) return GalleryAssetType.VIDEO;
  return null;
}

export function truncateGalleryAttachmentLabel(value: string, maxLength = 90) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
