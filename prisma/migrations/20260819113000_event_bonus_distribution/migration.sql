ALTER TYPE "GpLedgerEntryType" ADD VALUE 'EVENT_BONUS';

ALTER TABLE "AppConfig"
ADD COLUMN "guildGpBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Event"
ADD COLUMN "bonusDistributedAt" TIMESTAMP(3),
ADD COLUMN "bonusParticipantCount" INTEGER,
ADD COLUMN "bonusTotalGp" DOUBLE PRECISION,
ADD COLUMN "bonusGuildShareGp" DOUBLE PRECISION,
ADD COLUMN "bonusPerParticipantGp" DOUBLE PRECISION;

ALTER TABLE "GpLedgerEntry"
ADD COLUMN "eventId" TEXT;

CREATE INDEX "GpLedgerEntry_eventId_idx" ON "GpLedgerEntry"("eventId");

ALTER TABLE "GpLedgerEntry" ADD CONSTRAINT "GpLedgerEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
