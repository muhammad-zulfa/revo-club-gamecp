ALTER TABLE "AppConfig"
ADD COLUMN "discordNewsChannelId" TEXT;

CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tagAll" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsRecipient" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");
CREATE INDEX "News_eventId_idx" ON "News"("eventId");
CREATE INDEX "NewsRecipient_userId_createdAt_idx" ON "NewsRecipient"("userId", "createdAt");
CREATE UNIQUE INDEX "NewsRecipient_newsId_userId_key" ON "NewsRecipient"("newsId", "userId");

ALTER TABLE "News" ADD CONSTRAINT "News_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "News" ADD CONSTRAINT "News_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewsRecipient" ADD CONSTRAINT "NewsRecipient_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsRecipient" ADD CONSTRAINT "NewsRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
