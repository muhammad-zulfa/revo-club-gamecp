import { ApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureApprovedMemberProfile } from "@/lib/profile";

export async function setUserApprovalStatus(userId: string, status: ApprovalStatus, reviewedBy?: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: status,
      profileCompleted: status === ApprovalStatus.APPROVED ? false : undefined,
      approvedAt: status === ApprovalStatus.APPROVED ? new Date() : null
    }
  });

  if (status === ApprovalStatus.APPROVED) {
    await ensureApprovedMemberProfile(user.id);
  }

  await prisma.activityLog.create({
    data: {
      type: status === ApprovalStatus.APPROVED ? "user.approved" : "user.rejected",
      title: `${user.name} was ${status === ApprovalStatus.APPROVED ? "approved" : "rejected"}`,
      detail: reviewedBy ? `Reviewed by ${reviewedBy}` : user.discordHandle
    }
  }).catch(() => null);

  return user;
}

export async function hardDeleteUser(userId: string, deletedBy?: string) {
  const user = await prisma.user.delete({
    where: { id: userId }
  });

  await prisma.activityLog.create({
    data: {
      type: "user.deleted",
      title: `${user.name} registration was permanently deleted`,
      detail: deletedBy ? `Deleted by ${deletedBy}` : user.discordHandle
    }
  }).catch(() => null);

  return user;
}
