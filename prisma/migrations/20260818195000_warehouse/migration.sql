CREATE TYPE "WarehouseItemSource" AS ENUM ('PIT_BOSS', 'GUILD_SELLER');
CREATE TYPE "WarehouseItemStatus" AS ENUM ('STORED', 'LISTED', 'SOLD_EXTERNALLY', 'SOLD_TO_MEMBER', 'CANCELLED');

CREATE TABLE "WarehouseItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "askingPrice" DOUBLE PRECISION NOT NULL,
    "source" "WarehouseItemSource" NOT NULL,
    "status" "WarehouseItemStatus" NOT NULL DEFAULT 'STORED',
    "notes" TEXT,
    "sellerName" TEXT,
    "soldTo" TEXT,
    "soldAmount" DOUBLE PRECISION,
    "creditedAmount" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),
    "eventId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WarehouseItem_status_source_idx" ON "WarehouseItem"("status", "source");
CREATE INDEX "WarehouseItem_eventId_idx" ON "WarehouseItem"("eventId");
CREATE INDEX "WarehouseItem_soldAt_idx" ON "WarehouseItem"("soldAt");
CREATE INDEX "WarehouseItem_creditedAt_idx" ON "WarehouseItem"("creditedAt");

ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
