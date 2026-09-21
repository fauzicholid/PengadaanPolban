import "server-only";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessPackage } from "@/lib/package-access";

export async function getDocumentWithAccess(documentId: string) {
  const session = await requireSession();
  const doc = await prisma.stageDocument.findUnique({
    where: { id: documentId },
    include: {
      stage: {
        include: {
          package: {
            include: {
              bids: true,
              invitations: true,
              stages: true,
              rup: { include: { workUnit: true } },
              ppk: true,
            },
          },
        },
      },
      signatures: { include: { signerUser: true, signerVendor: true }, orderBy: { signedAt: "asc" } },
    },
  });
  if (!doc) return { session, doc: null, allowed: false };

  const winningBid = doc.stage.package.bids.find((b) => b.status === "WINNER");
  // STAF_PPK/PEJABAT_PENGADAAN must actually be assigned on this package
  // (canAccessPackage), not any document system-wide; PENYEDIA is narrower
  // still — only the winning vendor of THIS package, not just any bidder.
  const allowed =
    canAccessPackage(session, doc.stage.package) &&
    (session.role !== "PENYEDIA" || (!!winningBid && winningBid.vendorId === session.vendorId));

  return { session, doc, allowed, winningBid };
}
