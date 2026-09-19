import "server-only";
import { redirect } from "next/navigation";
import type { RoleCode } from "@/generated/prisma/enums";
import { getSession, type SessionPayload } from "@/lib/session";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: RoleCode[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect("/forbidden");
  }
  return session;
}

export async function getOptionalSession(): Promise<SessionPayload | null> {
  return getSession();
}
