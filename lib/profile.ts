import { Race, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function getOrCreatePrimaryGuild() {
  const existingGuild = await prisma.guild.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existingGuild) {
    return existingGuild;
  }

  return prisma.guild.create({
    data: {
      name: "Brave Fox",
      worldName: "RF Default Fresh",
      race: Race.ACCRETIA,
      description: "Standalone guild CRM",
    },
  });
}

export async function ensureApprovedMemberProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      approvalStatus: true,
      profileCompleted: true,
    },
  });

  if (!user || user.role !== UserRole.MEMBER || user.approvalStatus !== "APPROVED") {
    return null;
  }

  const existingMember =
    (await prisma.guildMember.findUnique({
      where: { userId: user.id },
    })) ??
    (await prisma.guildMember.findFirst({
      where: { nickname: user.name },
      orderBy: { joinedAt: "asc" },
    }));

  if (existingMember) {
    if (!existingMember.userId) {
      return prisma.guildMember.update({
        where: { id: existingMember.id },
        data: { userId: user.id },
      });
    }

    return existingMember;
  }

  const guild = await getOrCreatePrimaryGuild();

  return prisma.guildMember.create({
    data: {
      userId: user.id,
      nickname: user.name,
      level: 1,
      className: "Unset",
      race: guild.race,
      role: "Member",
      guildId: guild.id,
    },
  });
}

export async function getMemberProfileGate(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      approvalStatus: true,
      profileCompleted: true,
    },
  });

  if (!user || user.role !== UserRole.MEMBER || user.approvalStatus !== "APPROVED") {
    return { shouldCompleteProfile: false };
  }

  const member = await ensureApprovedMemberProfile(userId);

  return {
    shouldCompleteProfile: !user.profileCompleted,
    member,
  };
}

export async function getPostLoginDestination(userId: string, role: UserRole) {
  if (role === UserRole.ADMIN) return "/dashboard";

  const gate = await getMemberProfileGate(userId);
  return gate.shouldCompleteProfile ? "/profile" : "/dashboard";
}
