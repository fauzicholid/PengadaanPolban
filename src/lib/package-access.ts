import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StageCode } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { stagesForRole } from "@/lib/stage-access";

interface PackageForAccessCheck {
  ppkUserId: string;
  stages: { picUserId: string | null; stageCode: StageCode }[];
  bids?: { vendorId: string }[];
  invitations?: { vendorId: string }[];
}

// Single source of truth for "may this session see/act on THIS package",
// used both to gate the detail page (packages/[id]) and to scope which
// documents/SPI requests a given user may reach. A page-level requireSession()
// alone is not enough here — every entry point that fetches a package (or
// something scoped to one) by a client-supplied id must apply this.
export function canAccessPackage(session: SessionPayload, pkg: PackageForAccessCheck): boolean {
  if (["ADMIN", "KPA", "SPI"].includes(session.role)) return true;
  if (session.role === "PPK") return pkg.ppkUserId === session.userId;
  if (session.role === "STAF_PPK") return pkg.stages.some((s) => s.picUserId === session.userId);
  if (session.role === "PEJABAT_PENGADAAN") {
    const allowedStages = stagesForRole("PEJABAT_PENGADAAN");
    return pkg.stages.some((s) => s.picUserId === session.userId && allowedStages.includes(s.stageCode));
  }
  if (session.role === "PENYEDIA" && session.vendorId) {
    return (
      (pkg.bids ?? []).some((b) => b.vendorId === session.vendorId) ||
      (pkg.invitations ?? []).some((i) => i.vendorId === session.vendorId)
    );
  }
  return false;
}

// Equivalent scoping expressed as a Prisma where-clause, for list views that
// filter many packages at once rather than checking one already-fetched
// package. Keep this in lock-step with canAccessPackage above.
export function packageAccessWhereClause(session: SessionPayload): Prisma.ProcurementPackageWhereInput {
  if (["ADMIN", "KPA", "SPI"].includes(session.role)) return {};
  if (session.role === "PPK") return { ppkUserId: session.userId };
  if (session.role === "STAF_PPK") return { stages: { some: { picUserId: session.userId } } };
  if (session.role === "PEJABAT_PENGADAAN") {
    return {
      stages: { some: { picUserId: session.userId, stageCode: { in: stagesForRole("PEJABAT_PENGADAAN") } } },
    };
  }
  if (session.role === "PENYEDIA" && session.vendorId) {
    return {
      OR: [
        { bids: { some: { vendorId: session.vendorId } } },
        { invitations: { some: { vendorId: session.vendorId } } },
      ],
    };
  }
  return { id: "__none__" };
}
