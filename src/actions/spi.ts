"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notify";

export interface FormState {
  error?: string;
  success?: string;
}

async function spiUserIds() {
  const users = await prisma.user.findMany({
    where: { appointments: { some: { active: true, role: { code: "SPI" } } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function createReviewRequestAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["KPA", "PPK"]);
  const packageId = String(formData.get("packageId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();

  if (!packageId || !reason) return { error: "Paket dan alasan wajib diisi." };

  const request = await prisma.spiReviewRequest.create({
    data: { packageId, requestedBy: session.userId, requestType: "REQUEST", reason, scope },
  });

  await notifyMany(await spiUserIds(), {
    type: "REVIEW_REQUEST",
    title: "Permintaan Reviu SPI",
    message: `Permintaan reviu baru dari ${session.fullName}.`,
    link: `/spi/requests/${request.id}`,
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_review_request",
    entityId: request.id,
    action: "CREATE",
    newData: { packageId, reason },
  });

  revalidatePath("/spi/requests");
  redirect(`/spi/requests/${request.id}`);
}

export async function startRiskBasedReviewAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const packageId = String(formData.get("packageId") ?? "");
  const riskReasons = String(formData.get("riskReasons") ?? "");
  const riskLevel = String(formData.get("riskLevel") ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";

  const request = await prisma.spiReviewRequest.create({
    data: {
      packageId,
      requestedBy: session.userId,
      requestType: "RISK_BASED",
      reason: "Reviu berbasis risiko (rekomendasi sistem)",
      scope: riskReasons,
      review: {
        create: {
          reviewerUserId: session.userId,
          reviewStatus: "UNDER_REVIEW",
          riskLevel,
          riskReasons,
          startedAt: new Date(),
        },
      },
    },
    include: { review: true },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_review_request",
    entityId: request.id,
    action: "START_RISK_BASED",
    newData: { packageId, riskLevel },
  });

  revalidatePath("/spi/risk");
  redirect(`/spi/requests/${request.id}`);
}

export async function startReviewAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const reviewRequestId = String(formData.get("reviewRequestId") ?? "");

  const existing = await prisma.spiReview.findUnique({ where: { reviewRequestId } });
  if (existing) return { error: "Reviu untuk permintaan ini sudah dimulai." };

  await prisma.spiReview.create({
    data: {
      reviewRequestId,
      reviewerUserId: session.userId,
      reviewStatus: "UNDER_REVIEW",
      startedAt: new Date(),
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_review",
    entityId: reviewRequestId,
    action: "START",
  });

  revalidatePath(`/spi/requests/${reviewRequestId}`);
  return { success: "Reviu dimulai." };
}

export async function setRiskLevelAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const reviewId = String(formData.get("reviewId") ?? "");
  const riskLevel = String(formData.get("riskLevel") ?? "") as "LOW" | "MEDIUM" | "HIGH";

  await prisma.spiReview.update({ where: { id: reviewId }, data: { riskLevel } });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_review",
    entityId: reviewId,
    action: "SET_RISK_LEVEL",
    newData: { riskLevel },
  });

  revalidatePath("/spi");
  return { success: "Tingkat risiko diperbarui." };
}

export async function addFindingAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const reviewId = String(formData.get("reviewId") ?? "");
  const picUserId = String(formData.get("picUserId") ?? "");
  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "");

  if (!picUserId || !description || !dueDate) {
    return { error: "PIC, uraian temuan, dan batas waktu wajib diisi (BR-12)." };
  }

  const finding = await prisma.spiFinding.create({
    data: {
      spiReviewId: reviewId,
      picUserId,
      category: category || null,
      description,
      dueDate: new Date(dueDate),
      status: "FOLLOW_UP_REQUIRED",
    },
  });

  await prisma.spiReview.update({
    where: { id: reviewId },
    data: { reviewStatus: "FOLLOW_UP_REQUIRED" },
  });

  await notify({
    userId: picUserId,
    type: "SPI_FINDING",
    title: "Catatan/Temuan SPI",
    message: description.slice(0, 140),
    link: "/spi/followups",
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_finding",
    entityId: finding.id,
    action: "CREATE",
    newData: { description, dueDate },
  });

  revalidatePath("/spi");
  return { success: "Temuan tersimpan." };
}

export async function closeReviewAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const reviewId = String(formData.get("reviewId") ?? "");

  const review = await prisma.spiReview.findUnique({
    where: { id: reviewId },
    include: { findings: true },
  });
  if (!review) return { error: "Reviu tidak ditemukan." };

  const unresolved = review.findings.filter((f) => f.status !== "RESOLVED");
  if (unresolved.length > 0) {
    return {
      error: "Tindak lanjut belum dapat ditutup sebelum seluruh temuan diverifikasi selesai (BR-13).",
    };
  }

  await prisma.spiReview.update({
    where: { id: reviewId },
    data: { reviewStatus: "CLOSED", closedAt: new Date() },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_review",
    entityId: reviewId,
    action: "CLOSE",
  });

  revalidatePath("/spi");
  return { success: "Reviu ditutup." };
}

export async function submitFollowupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "KPA"]);
  const findingId = String(formData.get("findingId") ?? "");
  const response = String(formData.get("response") ?? "").trim();
  const evidenceUri = String(formData.get("evidenceUri") ?? "");

  const finding = await prisma.spiFinding.findUnique({ where: { id: findingId }, include: { review: true } });
  if (!finding) return { error: "Temuan tidak ditemukan." };
  if (finding.picUserId !== session.userId) {
    return { error: "Anda bukan PIC untuk temuan ini." };
  }
  if (!response) return { error: "Tanggapan wajib diisi." };

  await prisma.$transaction([
    prisma.spiFollowup.create({
      data: { findingId, submittedById: session.userId, response, evidenceUri: evidenceUri || null },
    }),
    prisma.spiFinding.update({ where: { id: findingId }, data: { status: "FOLLOW_UP_VERIFICATION" } }),
    prisma.spiReview.update({
      where: { id: finding.spiReviewId },
      data: { reviewStatus: "FOLLOW_UP_VERIFICATION" },
    }),
  ]);

  await notify({
    userId: finding.review.reviewerUserId,
    type: "FOLLOWUP_DUE",
    title: "Tindak Lanjut Diajukan",
    message: "PIC telah mengunggah bukti tindak lanjut, menunggu verifikasi SPI.",
    link: "/spi/followups",
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_followup",
    entityId: findingId,
    action: "SUBMIT",
  });

  revalidatePath("/spi/followups");
  return { success: "Tindak lanjut terkirim, menunggu verifikasi SPI." };
}

export async function verifyFollowupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const followupId = String(formData.get("followupId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "VERIFIED" | "REVISION";
  const verificationNotes = String(formData.get("verificationNotes") ?? "");

  if (decision === "REVISION" && !verificationNotes.trim()) {
    return { error: "Catatan wajib diisi bila tindak lanjut dikembalikan." };
  }

  const followup = await prisma.spiFollowup.findUnique({
    where: { id: followupId },
    include: { finding: { include: { review: true } } },
  });
  if (!followup) return { error: "Tindak lanjut tidak ditemukan." };

  await prisma.spiFollowup.update({
    where: { id: followupId },
    data: {
      verificationStatus: decision,
      verifiedById: session.userId,
      verifiedAt: new Date(),
      verificationNotes: verificationNotes || null,
    },
  });

  await prisma.spiFinding.update({
    where: { id: followup.findingId },
    data: { status: decision === "VERIFIED" ? "RESOLVED" : "FOLLOW_UP_REQUIRED" },
  });

  if (decision === "VERIFIED") {
    const remaining = await prisma.spiFinding.count({
      where: { spiReviewId: followup.finding.spiReviewId, NOT: { status: "RESOLVED" } },
    });
    if (remaining === 0) {
      await prisma.spiReview.update({
        where: { id: followup.finding.spiReviewId },
        data: { reviewStatus: "CLOSED", closedAt: new Date() },
      });
    } else {
      await prisma.spiReview.update({
        where: { id: followup.finding.spiReviewId },
        data: { reviewStatus: "FOLLOW_UP_REQUIRED" },
      });
    }
  }

  await notify({
    userId: followup.submittedById,
    type: "FOLLOWUP_DUE",
    title: `Verifikasi Tindak Lanjut: ${decision}`,
    message: verificationNotes || "Tindak lanjut telah diverifikasi.",
    link: "/spi/followups",
  });

  await writeAudit({
    userId: session.userId,
    entityType: "spi_followup",
    entityId: followupId,
    action: `VERIFY_${decision}`,
  });

  revalidatePath("/spi/followups");
  revalidatePath("/spi");
  return { success: "Verifikasi tersimpan." };
}
