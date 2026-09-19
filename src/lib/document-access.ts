import "server-only";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function getDocumentWithAccess(documentId: string) {
  const session = await requireSession();
  const doc = await prisma.stageDocument.findUnique({
    where: { id: documentId },
    include: {
      stage: {
        include: {
          package: { include: { bids: true, rup: { include: { workUnit: true } }, ppk: true } },
        },
      },
      signatures: { include: { signerUser: true, signerVendor: true }, orderBy: { signedAt: "asc" } },
    },
  });
  if (!doc) return { session, doc: null, allowed: false };

  const winningBid = doc.stage.package.bids.find((b) => b.status === "WINNER");
  const allowed =
    ["ADMIN", "SPI", "KPA"].includes(session.role) ||
    (session.role === "PPK" && doc.stage.package.ppkUserId === session.userId) ||
    session.role === "STAF_PPK" ||
    session.role === "PEJABAT_PENGADAAN" ||
    (session.role === "PENYEDIA" && !!winningBid && winningBid.vendorId === session.vendorId);

  return { session, doc, allowed, winningBid };
}
