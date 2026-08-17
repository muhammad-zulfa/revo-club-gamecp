ALTER TABLE "AppConfig"
ADD COLUMN "discordEventChannelId" TEXT,
ADD COLUMN "discordPitBossChannelId" TEXT,
ADD COLUMN "discordChipWarChannelId" TEXT,
ADD COLUMN "discordGvgChannelId" TEXT,
ADD COLUMN "discordOtherChannelId" TEXT,
ADD COLUMN "discordMemberRoleId" TEXT,
ADD COLUMN "discordEventReminderOffsets" TEXT;

ALTER TABLE "Event"
ADD COLUMN "discordVoiceChannelId" TEXT,
ADD COLUMN "discordReminderSentAt" TIMESTAMP(3);

CREATE TABLE "EventReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "minutesOffset" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventReminder_scheduledAt_sentAt_idx" ON "EventReminder"("scheduledAt", "sentAt");
CREATE UNIQUE INDEX "EventReminder_eventId_minutesOffset_key" ON "EventReminder"("eventId", "minutesOffset");

ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
