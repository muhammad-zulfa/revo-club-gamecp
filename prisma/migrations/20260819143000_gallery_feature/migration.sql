CREATE TYPE "GalleryAssetType" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "GalleryFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GalleryAsset" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "GalleryAssetType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsGalleryFolder" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsGalleryFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsGalleryAsset" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsGalleryAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GalleryFolder_name_key" ON "GalleryFolder"("name");
CREATE INDEX "GalleryFolder_createdAt_idx" ON "GalleryFolder"("createdAt");
CREATE INDEX "GalleryAsset_folderId_createdAt_idx" ON "GalleryAsset"("folderId", "createdAt");
CREATE UNIQUE INDEX "NewsGalleryFolder_newsId_folderId_key" ON "NewsGalleryFolder"("newsId", "folderId");
CREATE INDEX "NewsGalleryFolder_folderId_createdAt_idx" ON "NewsGalleryFolder"("folderId", "createdAt");
CREATE UNIQUE INDEX "NewsGalleryAsset_newsId_assetId_key" ON "NewsGalleryAsset"("newsId", "assetId");
CREATE INDEX "NewsGalleryAsset_assetId_createdAt_idx" ON "NewsGalleryAsset"("assetId", "createdAt");

ALTER TABLE "GalleryFolder" ADD CONSTRAINT "GalleryFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GalleryAsset" ADD CONSTRAINT "GalleryAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "GalleryFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryAsset" ADD CONSTRAINT "GalleryAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewsGalleryFolder" ADD CONSTRAINT "NewsGalleryFolder_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsGalleryFolder" ADD CONSTRAINT "NewsGalleryFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "GalleryFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsGalleryAsset" ADD CONSTRAINT "NewsGalleryAsset_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsGalleryAsset" ADD CONSTRAINT "NewsGalleryAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "GalleryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
