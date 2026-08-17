CREATE TYPE "GpLedgerEntryType" AS ENUM ('TRANSFER_SENT', 'TRANSFER_RECEIVED', 'WAREHOUSE_PURCHASE', 'ADMIN_ADJUSTMENT');

ALTER TABLE "User"
ADD COLUMN "gpBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "GpLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GpLedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "relatedUserId" TEXT,
    "warehouseItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GpLedgerEntry_userId_createdAt_idx" ON "GpLedgerEntry"("userId", "createdAt");
CREATE INDEX "GpLedgerEntry_relatedUserId_idx" ON "GpLedgerEntry"("relatedUserId");
CREATE INDEX "GpLedgerEntry_warehouseItemId_idx" ON "GpLedgerEntry"("warehouseItemId");

ALTER TABLE "GpLedgerEntry" ADD CONSTRAINT "GpLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GpLedgerEntry" ADD CONSTRAINT "GpLedgerEntry_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GpLedgerEntry" ADD CONSTRAINT "GpLedgerEntry_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "WarehouseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
