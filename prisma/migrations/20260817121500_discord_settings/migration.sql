-- AlterTable
ALTER TABLE "User" ADD COLUMN "discordUserId" TEXT;

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "discordServerName" TEXT,
    "discordInviteUrl" TEXT,
    "discordRegistrationLabel" TEXT,
    "discordApprovalWebhookUrl" TEXT,
    "discordInteractionsPublicKey" TEXT,
    "discordAdminRoleId" TEXT,
    "discordAdminUserIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordUserId_key" ON "User"("discordUserId");
