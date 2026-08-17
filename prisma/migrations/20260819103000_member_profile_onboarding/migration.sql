ALTER TABLE "User"
ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "GuildMember"
ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "GuildMember_userId_key" ON "GuildMember"("userId");

ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
