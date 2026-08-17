import { ApprovalStatus, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "rf_crm_session";

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
  userId: string;
};

export function hashPassword(password: string) {
  const salt = "rf-guild-crm";
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, passwordHash: string) {
  const incomingHash = Buffer.from(hashPassword(password), "hex");
  const storedHash = Buffer.from(passwordHash, "hex");

  if (incomingHash.length !== storedHash.length) return false;

  return timingSafeEqual(incomingHash, storedHash);
}

export function createSessionValue(session: SessionUser) {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function parseSessionValue(value?: string | null): SessionUser | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionUser;
    if (!parsed.email || !parsed.name || !parsed.role || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return parseSessionValue(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await getSession();
  return session?.role === UserRole.ADMIN ? session : null;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getApprovalMessage(status: ApprovalStatus) {
  if (status === ApprovalStatus.PENDING) return "Your registration is waiting for admin approval.";
  if (status === ApprovalStatus.REJECTED) return "Your registration was rejected. Contact an admin if you need help.";
  return "Your account is approved.";
}
