ALTER TABLE "AppConfig"
ADD COLUMN "discordEventAttendanceMinutes" TEXT;

DROP INDEX IF EXISTS "User_discordUserId_key";

ALTER TABLE "User"
DROP COLUMN IF EXISTS "discordUserId";

CREATE TYPE "EventAttendanceStatus" AS ENUM ('IN_VOICE', 'LEFT', 'PRESENT');

CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "discordId" TEXT NOT NULL,
    "discordHandle" TEXT,
    "status" "EventAttendanceStatus" NOT NULL DEFAULT 'IN_VOICE',
    "currentVoiceChannelId" TEXT,
    "firstJoinedAt" TIMESTAMP(3) NOT NULL,
    "lastJoinedAt" TIMESTAMP(3),
    "lastLeftAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "dmSentAt" TIMESTAMP(3),
    "proofNote" TEXT,
    "proofSubmittedAt" TIMESTAMP(3),
    "totalSecondsInVoice" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventAttendance_eventId_status_idx" ON "EventAttendance"("eventId", "status");
CREATE INDEX "EventAttendance_discordId_idx" ON "EventAttendance"("discordId");
CREATE INDEX "EventAttendance_lastJoinedAt_idx" ON "EventAttendance"("lastJoinedAt");
CREATE INDEX "EventAttendance_qualifiedAt_idx" ON "EventAttendance"("qualifiedAt");
CREATE UNIQUE INDEX "EventAttendance_eventId_discordId_key" ON "EventAttendance"("eventId", "discordId");

ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
