-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "discordHandle" TEXT,
ADD COLUMN     "joinedDiscord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER';

-- Backfill legacy rows if the table already contains users
UPDATE "User"
SET
  "passwordHash" = COALESCE("passwordHash", ''),
  "discordHandle" = COALESCE("discordHandle", "email"),
  "approvalStatus" = 'APPROVED',
  "joinedDiscord" = true
WHERE "passwordHash" IS NULL
   OR "discordHandle" IS NULL;

-- AlterTable
ALTER TABLE "User"
ALTER COLUMN "discordHandle" SET NOT NULL,
ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_discordHandle_key" ON "User"("discordHandle");
