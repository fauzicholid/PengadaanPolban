"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { renderStageDocumentHtml } from "@/lib/document-template";
import {
  buildMailMergeData,
  renderDocxTemplate,
  docxBufferToHtml,
  DocxTemplateError,
} from "@/lib/document-mailmerge";
import { makeVerificationCode, makeSignatureHash } from "@/lib/qr";
import {
  GENERATABLE_DOCUMENT_TYPES,
  DOCUMENT_REQUIRED_SIGNERS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/constants";

export interface DocActionState {
  error?: string;
  success?: string;
}

// Caller already has the document's prior signatures on hand (it just read
// them to validate the request) — pass those plus the role just signed
// instead of re-fetching the document to check completeness.
async function maybeFinalize(documentId: string, documentType: string, signedRoles: Set<string>) {
  const required = DOCUMENT_REQUIRED_SIGNERS[documentType] ?? [];
  const complete = required.length > 0 && required.every((r) => signedRoles.has(r));
  if (complete) {
    await prisma.stageDocument.update({ where: { id: documentId }, data: { status: "FINAL" } });
  }
}

export async function generateStageDocumentAction(
  _prev: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  const session = await requireRole(["STAF_PPK", "PPK", "ADMIN"]);

  const stageId = String(formData.get("stageId") ?? "");
  const documentType = String(formData.get("documentType") ?? "");

  if (!stageId || !documentType) {
    return { error: "Tahapan dan jenis dokumen wajib dipilih." };
  }
  if (!GENERATABLE_DOCUMENT_TYPES.includes(documentType as (typeof GENERATABLE_DOCUMENT_TYPES)[number])) {
    return { error: "Jenis dokumen ini tidak dapat digenerate otomatis." };
  }

  const stage = await prisma.packageStage.findUnique({
    where: { id: stageId },
    include: {
      package: { include: { rup: { include: { workUnit: true } } } },
      approvals: { include: { approver: true }, orderBy: { decidedAt: "desc" } },
    },
  });
  if (!stage) return { error: "Tahapan tidak ditemukan." };
  if (session.role === "PPK" && stage.package.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  type BidWithVendor = Prisma.BidGetPayload<{ include: { vendor: true } }>;
  let bids: BidWithVendor[] = [];
  let winningBid: BidWithVendor | null = null;
  if (documentType === "BA_EVALUASI" || documentType === "BA_HASIL") {
    bids = await prisma.bid.findMany({
      where: { packageId: stage.packageId },
      include: { vendor: true },
      orderBy: { submittedAt: "desc" },
    });
    winningBid = bids.find((b) => b.status === "WINNER") ?? null;
  }

  type ContractWithVendor = Prisma.ContractGetPayload<{ include: { vendor: true } }>;
  let contract: ContractWithVendor | null = null;
  if (documentType === "SPK_KONTRAK") {
    contract = await prisma.contract.findUnique({
      where: { packageId: stage.packageId },
      include: { vendor: true },
    });
    if (!contract) {
      return { error: "Data kontrak belum dibuat. Lengkapi tab Kontrak terlebih dahulu." };
    }
  }

  const bidsForTemplate = bids.map((b) => ({
    vendor: { companyName: b.vendor.companyName },
    offeredValue: b.offeredValue,
    status: b.status,
    technicalScore: b.technicalScore,
  }));
  const winningBidForTemplate = winningBid
    ? {
        vendor: { companyName: winningBid.vendor.companyName },
        offeredValue: winningBid.offeredValue,
        status: winningBid.status,
        technicalScore: winningBid.technicalScore,
      }
    : null;
  const contractForTemplate = contract
    ? {
        contractNumber: contract.contractNumber,
        contractValue: contract.contractValue,
        startDate: contract.startDate,
        endDate: contract.endDate,
        vendor: { companyName: contract.vendor.companyName },
      }
    : null;

  const docTemplate = await prisma.documentTemplate.findFirst({
    where: { documentType, active: true },
    orderBy: { uploadedAt: "desc" },
  });

  let html: string;
  if (docTemplate) {
    const documentNumber = `${documentType}/${stage.package.packageCode}/${Date.now()}`;
    const mailMergeData = buildMailMergeData({
      documentType,
      documentNumber,
      pkg: stage.package,
      stage,
      bids: bidsForTemplate,
      winningBid: winningBidForTemplate,
      contract: contractForTemplate,
    });
    try {
      const filledDocx = renderDocxTemplate(Buffer.from(docTemplate.fileData), mailMergeData);
      html = await docxBufferToHtml(filledDocx);
    } catch (err) {
      return { error: err instanceof DocxTemplateError ? err.message : "Gagal memproses template dokumen." };
    }
  } else {
    html = renderStageDocumentHtml({
      documentType,
      pkg: stage.package,
      stage,
      bids: bidsForTemplate,
      winningBid: winningBidForTemplate,
      contract: contractForTemplate,
    });
  }

  const existing = await prisma.stageDocument.findFirst({
    where: { stageId, documentType },
    orderBy: { version: "desc" },
  });

  const doc = existing
    ? await prisma.stageDocument.update({
        where: { id: existing.id },
        data: {
          version: existing.version + 1,
          status: "UPLOADED",
          isGenerated: true,
          contentHtml: html,
          fileUri: null,
          uploadedById: session.userId,
          uploadedAt: new Date(),
        },
      })
    : await prisma.stageDocument.create({
        data: {
          stageId,
          documentType,
          required: true,
          status: "UPLOADED",
          isGenerated: true,
          contentHtml: html,
          uploadedById: session.userId,
          uploadedAt: new Date(),
        },
      });

  // Regenerating clears any prior signatures — the content changed.
  if (existing) {
    await prisma.documentSignature.deleteMany({ where: { documentId: doc.id } });
  }

  await writeAudit({
    userId: session.userId,
    entityType: "stage_document",
    entityId: doc.id,
    action: "GENERATE",
    newData: { documentType, stageId },
  });

  revalidatePath(`/packages/${stage.packageId}`);
  return { success: `${DOCUMENT_TYPE_LABELS[documentType] ?? documentType} berhasil digenerate.` };
}

export async function signStageDocumentAction(
  _prev: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  const session = await requireRole(["PPK", "ADMIN"]);
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { error: "Dokumen tidak ditemukan." };

  const doc = await prisma.stageDocument.findUnique({
    where: { id: documentId },
    include: { stage: { include: { package: true } }, signatures: true },
  });
  if (!doc) return { error: "Dokumen tidak ditemukan." };
  if (session.role === "PPK" && doc.stage.package.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }
  if (!doc.isGenerated) {
    return { error: "Dokumen ini bukan dokumen hasil generate sistem." };
  }
  if (doc.signatures.some((s) => s.signerRole === "PPK")) {
    return { error: "Dokumen sudah ditandatangani PPK." };
  }

  const code = makeVerificationCode();
  const hash = makeSignatureHash([documentId, "PPK", session.userId, Date.now()]);

  await prisma.documentSignature.create({
    data: {
      documentId,
      signerRole: "PPK",
      signerUserId: session.userId,
      signerName: session.fullName,
      verificationCode: code,
      signatureHash: hash,
    },
  });

  const signedRoles = new Set([...doc.signatures.map((s) => s.signerRole), "PPK"]);
  await maybeFinalize(documentId, doc.documentType, signedRoles);
  await writeAudit({
    userId: session.userId,
    entityType: "stage_document",
    entityId: documentId,
    action: "SIGN",
    newData: { role: "PPK" },
  });

  revalidatePath(`/packages/${doc.stage.packageId}`);
  revalidatePath(`/documents/${documentId}`);
  return { success: "Dokumen berhasil ditandatangani." };
}

export async function signStageDocumentAsVendorAction(
  _prev: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) {
    return { error: "Lengkapi registrasi penyedia terlebih dahulu." };
  }
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { error: "Dokumen tidak ditemukan." };

  const doc = await prisma.stageDocument.findUnique({
    where: { id: documentId },
    include: {
      stage: { include: { package: { include: { bids: { include: { vendor: true } } } } } },
      signatures: true,
    },
  });
  if (!doc) return { error: "Dokumen tidak ditemukan." };
  if (!doc.isGenerated) {
    return { error: "Dokumen ini bukan dokumen hasil generate sistem." };
  }

  const required = DOCUMENT_REQUIRED_SIGNERS[doc.documentType] ?? [];
  if (!required.includes("PENYEDIA")) {
    return { error: "Dokumen ini tidak memerlukan tanda tangan penyedia." };
  }

  const winningBid = doc.stage.package.bids.find((b) => b.status === "WINNER");
  if (!winningBid || winningBid.vendorId !== session.vendorId) {
    return { error: "Hanya penyedia pemenang paket ini yang dapat menandatangani dokumen." };
  }
  if (doc.signatures.some((s) => s.signerRole === "PENYEDIA")) {
    return { error: "Dokumen sudah ditandatangani penyedia." };
  }

  const code = makeVerificationCode();
  const hash = makeSignatureHash([documentId, "PENYEDIA", session.vendorId, Date.now()]);

  await prisma.documentSignature.create({
    data: {
      documentId,
      signerRole: "PENYEDIA",
      signerVendorId: session.vendorId,
      signerName: `${session.fullName} (${winningBid.vendor.companyName})`,
      verificationCode: code,
      signatureHash: hash,
    },
  });

  const signedRoles = new Set([...doc.signatures.map((s) => s.signerRole), "PENYEDIA"]);
  await maybeFinalize(documentId, doc.documentType, signedRoles);
  await writeAudit({
    userId: session.userId,
    entityType: "stage_document",
    entityId: documentId,
    action: "SIGN",
    newData: { role: "PENYEDIA" },
  });

  revalidatePath(`/packages/${doc.stage.packageId}`);
  revalidatePath(`/documents/${documentId}`);
  return { success: "Dokumen berhasil ditandatangani." };
}

// Serah terima PPK -> KPA: KPA hanya dapat menandatangani BAST setelah PPK
// menandatangani lebih dulu (lihat urutan pada DOCUMENT_REQUIRED_SIGNERS).
export async function signStageDocumentAsKpaAction(
  _prev: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  const session = await requireRole(["KPA", "ADMIN"]);
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { error: "Dokumen tidak ditemukan." };

  const doc = await prisma.stageDocument.findUnique({
    where: { id: documentId },
    include: { stage: { include: { package: true } }, signatures: true },
  });
  if (!doc) return { error: "Dokumen tidak ditemukan." };
  if (!doc.isGenerated) {
    return { error: "Dokumen ini bukan dokumen hasil generate sistem." };
  }

  const required = DOCUMENT_REQUIRED_SIGNERS[doc.documentType] ?? [];
  if (!required.includes("KPA")) {
    return { error: "Dokumen ini tidak memerlukan tanda tangan KPA." };
  }
  if (!doc.signatures.some((s) => s.signerRole === "PPK")) {
    return { error: "Menunggu tanda tangan PPK terlebih dahulu sebelum diserahterimakan ke KPA." };
  }
  if (doc.signatures.some((s) => s.signerRole === "KPA")) {
    return { error: "Dokumen sudah ditandatangani KPA." };
  }

  const code = makeVerificationCode();
  const hash = makeSignatureHash([documentId, "KPA", session.userId, Date.now()]);

  await prisma.documentSignature.create({
    data: {
      documentId,
      signerRole: "KPA",
      signerUserId: session.userId,
      signerName: session.fullName,
      verificationCode: code,
      signatureHash: hash,
    },
  });

  const signedRoles = new Set([...doc.signatures.map((s) => s.signerRole), "KPA"]);
  await maybeFinalize(documentId, doc.documentType, signedRoles);
  await writeAudit({
    userId: session.userId,
    entityType: "stage_document",
    entityId: documentId,
    action: "SIGN",
    newData: { role: "KPA" },
  });

  revalidatePath(`/packages/${doc.stage.packageId}`);
  revalidatePath(`/documents/${documentId}`);
  return { success: "Dokumen berhasil ditandatangani." };
}
