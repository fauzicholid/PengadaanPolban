import "server-only";
import { prisma } from "@/lib/prisma";

interface AuditParams {
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  oldData?: unknown;
  newData?: unknown;
}

export async function writeAudit(params: AuditParams) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      action: params.action,
      oldData: params.oldData === undefined ? undefined : (params.oldData as object),
      newData: params.newData === undefined ? undefined : (params.newData as object),
    },
  });
}
