-- AlterTable
ALTER TABLE "User" ADD COLUMN "discordId" TEXT;

-- AlterTable
ALTER TABLE "AppConfig"
ADD COLUMN "discordOAuthClientId" TEXT,
ADD COLUMN "discordOAuthClientSecret" TEXT,
ADD COLUMN "discordGuildId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
