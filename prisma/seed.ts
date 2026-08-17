import { ApprovalStatus, EventCategory, PrismaClient, Race, UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
  await prisma.appConfig.deleteMany();
  await prisma.event.deleteMany();
  await prisma.guildMember.deleteMany();
  await prisma.guild.deleteMany();
  await prisma.activityLog.deleteMany();

  const guild = await prisma.guild.create({
    data: {
      name: "Brave Fox",
      worldName: "RF Default Fresh",
      race: Race.ACCRETIA,
      description: "Standalone guild CRM demo",
      members: {
        create: [
          { nickname: "Kenzaki", level: 55, className: "Striker", race: Race.ACCRETIA, role: "Guild Master", isOnline: true },
          { nickname: "Requiem", level: 54, className: "Punisher", race: Race.ACCRETIA, role: "Council", isOnline: true },
          { nickname: "Athena", level: 53, className: "Launcher", race: Race.ACCRETIA, role: "Member", isOnline: true },
          { nickname: "Vortex", level: 52, className: "Mercenary", race: Race.ACCRETIA, role: "Member", isOnline: false, lastSeenAt: new Date(Date.now() - 1000 * 60 * 40) },
          { nickname: "ZeroCool", level: 50, className: "Striker", race: Race.ACCRETIA, role: "Member", isOnline: false, lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 7) },
          { nickname: "Lunaris", level: 51, className: "Punisher", race: Race.ACCRETIA, role: "Trial", isOnline: true }
        ]
      }
    }
  });

  await prisma.activityLog.createMany({
    data: [
      { type: "member.online", title: "Kenzaki is online", detail: guild.name },
      { type: "member.joined", title: "Lunaris joined the guild", detail: "Trial member" },
      { type: "guild.update", title: "Guild profile updated", detail: "Description changed" }
    ]
  });

  await prisma.user.createMany({
    data: [
      {
        email: process.env.DEMO_ADMIN_EMAIL ?? "admin@guild.local",
        name: "Guild Admin",
        passwordHash: hashPassword(process.env.DEMO_ADMIN_PASSWORD ?? "admin123"),
        role: UserRole.ADMIN,
        approvalStatus: ApprovalStatus.APPROVED,
        discordHandle: "guildadmin#0001",
        discordId: "discord-admin-seed",
        joinedDiscord: true,
        approvedAt: new Date()
      },
      {
        email: "applicant@guild.local",
        name: "Pending Recruit",
        passwordHash: hashPassword("pending123"),
        role: UserRole.MEMBER,
        approvalStatus: ApprovalStatus.PENDING,
        discordHandle: "pendingrecruit#1234",
        discordId: "discord-pending-seed",
        joinedDiscord: true
      }
    ]
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: process.env.DEMO_ADMIN_EMAIL ?? "admin@guild.local" }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (adminUser) {
    await prisma.event.createMany({
      data: [
        {
          title: "Ether Pit Boss Rotation",
          description: "Main raid party with standby support in voice.",
          category: EventCategory.PIT_BOSS,
          startAt: new Date(today.getTime() + 19 * 60 * 60 * 1000),
          endAt: new Date(today.getTime() + 20 * 60 * 60 * 1000),
          createdById: adminUser.id
        },
        {
          title: "Evening GvG Prep",
          description: "Finalize roster, consumables, and target assignments before prime time.",
          category: EventCategory.GVG,
          startAt: new Date(today.getTime() + 20 * 60 * 60 * 1000 + 15 * 60 * 1000),
          endAt: new Date(today.getTime() + 21 * 60 * 60 * 1000),
          createdById: adminUser.id
        },
        {
          title: "Late Night Strategy Sync",
          description: "Quick debrief after boss rotation for callers and support roles.",
          category: EventCategory.OTHER,
          startAt: new Date(today.getTime() + 21 * 60 * 60 * 1000 + 30 * 60 * 1000),
          endAt: new Date(today.getTime() + 22 * 60 * 60 * 1000),
          createdById: adminUser.id
        },
        {
          title: "Nightly Chip War",
          description: "Show up 15 minutes early for prep and assignments.",
          category: EventCategory.CHIP_WAR,
          startAt: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000),
          endAt: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000),
          createdById: adminUser.id
        },
        {
          title: "Chip War Recovery Group",
          description: "Short regroup session for highlights, follow-up tasks, and attendance notes.",
          category: EventCategory.OTHER,
          startAt: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000 + 15 * 60 * 1000),
          endAt: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000),
          createdById: adminUser.id
        },
        {
          title: "Saturday GvG Scrim",
          description: "Roster lock 30 minutes before start.",
          category: EventCategory.GVG,
          startAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000),
          endAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000),
          createdById: adminUser.id
        }
      ]
    });
  }

  await prisma.appConfig.create({
    data: {
      id: "default",
      discordServerName: "Brave Fox Guild Discord",
      discordInviteUrl: "https://discord.gg/example",
      discordRegistrationLabel: "registration",
      discordEventReminderOffsets: "60,15,0",
      discordAdminUserIds: "100000000000000001"
    }
  });
}

main().finally(async () => prisma.$disconnect());
