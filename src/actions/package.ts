"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notify";
import { STAGE_BLUEPRINT, STAGE_TO_PACKAGE_STATUS } from "@/lib/constants";
import { canCompleteStage, computeProgress } from "@/lib/workflow";
import { canActOnStage, STAGE_ACTOR_ROLES } from "@/lib/stage-access";
import { isHighValuePackage } from "@/lib/risk";
import type { StageCode } from "@/generated/prisma/enums";

export interface FormState {
  error?: string;
  success?: string;
}

function generatePackageCode(fiscalYear: number, workUnitCode: string, seq: number) {
  return `PBJ-${fiscalYear}-${workUnitCode}-${String(seq).padStart(5, "0")}`;
}

export async function createPackageFromRupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK"]);
  const rupId = String(formData.get("rupId") ?? "");
  const packageName = String(formData.get("packageName") ?? "").trim();
  const procurementType = String(formData.get("procurementType") ?? "");

  if (!rupId || !packageName) {
    return { error: "RUP dan nama paket wajib diisi." };
  }

  const rup = await prisma.rup.findUnique({ where: { id: rupId }, include: { workUnit: true } });
  if (!rup) return { error: "RUP tidak ditemukan." };

  const count = await prisma.procurementPackage.count({ where: { rup: { fiscalYear: rup.fiscalYear } } });
  const packageCode = generatePackageCode(rup.fiscalYear, rup.workUnit.code, count + 1);

  const pkg = await prisma.procurementPackage.create({
    data: {
      rupId: rup.id,
      packageCode,
      ppkUserId: session.userId,
      packageName,
      procurementType: procurementType || rup.procurementType,
      status: "PERSIAPAN",
      budgetCeiling: rup.budgetCeiling,
      stages: {
        create: STAGE_BLUEPRINT.map((bp) => ({
          stageCode: bp.code,
          stageName: bp.name,
          sequenceNo: bp.sequenceNo,
          weight: bp.weight,
          status: bp.code === "RUP" ? "COMPLETED" : bp.code === "PERSIAPAN" ? "IN_PROGRESS" : "NOT_STARTED",
          startAt: bp.code === "RUP" || bp.code === "PERSIAPAN" ? new Date() : null,
          completedAt: bp.code === "RUP" ? new Date() : null,
          picUserId: bp.code === "PERSIAPAN" ? session.userId : null,
          documents: {
            create: bp.requiredDocuments.map((d) => ({
              documentType: d.type,
              required: true,
              status: "DRAFT" as const,
            })),
          },
        })),
      },
    },
  });

  await prisma.procurementPackage.update({
    where: { id: pkg.id },
    data: { progressPercent: computeProgress([{ weight: 5, status: "COMPLETED" }]) },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "procurement_package",
    entityId: pkg.id,
    action: "CREATE",
    newData: { packageCode, rupId, packageName },
  });

  revalidatePath("/packages");
  revalidatePath("/rup");
  redirect(`/packages/${pkg.id}`);
}

export async function updatePackageDraftAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK", "STAF_PPK"]);
  const packageId = String(formData.get("packageId") ?? "");

  const pkg = await prisma.procurementPackage.findUnique({ where: { id: packageId } });
  if (!pkg) return { error: "Paket tidak ditemukan." };
  if (session.role === "PPK" && pkg.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  await prisma.procurementPackage.update({
    where: { id: packageId },
    data: {
      kakSummary: String(formData.get("kakSummary") ?? "") || null,
      specification: String(formData.get("specification") ?? "") || null,
      hpsValue: formData.get("hpsValue") ? Number(formData.get("hpsValue")) : null,
      contractDraft: String(formData.get("contractDraft") ?? "") || null,
      requirements: String(formData.get("requirements") ?? "") || null,
      scheduleNotes: String(formData.get("scheduleNotes") ?? "") || null,
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "procurement_package",
    entityId: packageId,
    action: "UPDATE_DRAFT",
  });

  revalidatePath(`/packages/${packageId}`);
  return { success: "Draf paket tersimpan." };
}

export async function uploadStageDocumentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireSession();
  const stageId = String(formData.get("stageId") ?? "");
  const documentType = String(formData.get("documentType") ?? "").trim();
  const fileUri = String(formData.get("fileUri") ?? "").trim();

  const stage = await prisma.packageStage.findUnique({
    where: { id: stageId },
    include: { package: true, documents: true },
  });
  if (!stage) return { error: "Tahapan tidak ditemukan." };
  if (!canActOnStage(session.role, stage.stageCode) || (session.role === "PPK" && stage.package.ppkUserId !== session.userId)) {
    return { error: "Anda tidak berwenang mengunggah dokumen pada tahap ini." };
  }
  if (!documentType || !fileUri) return { error: "Jenis dokumen dan berkas wajib diisi." };

  const existing = stage.documents.find((d) => d.documentType === documentType);
  const checksum = `sha256-${Buffer.from(fileUri + Date.now()).toString("hex").slice(0, 16)}`;

  if (existing) {
    await prisma.stageDocument.update({
      where: { id: existing.id },
      data: {
        fileUri,
        checksum,
        version: existing.version + 1,
        status: "UPLOADED",
        uploadedById: session.userId,
        uploadedAt: new Date(),
      },
    });
  } else {
    await prisma.stageDocument.create({
      data: {
        stageId,
        documentType,
        required: false,
        fileUri,
        checksum,
        status: "UPLOADED",
        uploadedById: session.userId,
        uploadedAt: new Date(),
      },
    });
  }

  if (stage.status === "WAITING_DOCUMENT") {
    await prisma.packageStage.update({ where: { id: stageId }, data: { status: "IN_PROGRESS" } });
  }

  await writeAudit({
    userId: session.userId,
    entityType: "stage_document",
    entityId: stageId,
    action: "UPLOAD",
    newData: { documentType, fileUri },
  });

  revalidatePath(`/packages/${stage.packageId}`);
  return { success: "Dokumen berhasil diunggah." };
}

export async function approveStageDocumentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireSession();
  const documentId = String(formData.get("documentId") ?? "");
  const doc = await prisma.stageDocument.findUnique({
    where: { id: documentId },
    include: { stage: { include: { package: true } } },
  });
  if (!doc) return { error: "Dokumen tidak ditemukan." };
  const isOwnerPpk = session.role === "PPK" && doc.stage.package.ppkUserId === session.userId;
  const canApprove = session.role === "ADMIN" || isOwnerPpk || canActOnStage(session.role, doc.stage.stageCode);
  if (!canApprove) return { error: "Anda tidak berwenang menyetujui dokumen ini." };

  await prisma.stageDocument.update({
    where: { id: documentId },
    data: { status: "APPROVED" },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "stage_document",
    entityId: documentId,
    action: "APPROVE",
  });

  revalidatePath(`/packages/${doc.stage.packageId}`);
  return { success: "Dokumen berhasil disetujui." };
}

async function activateNextStage(packageId: string) {
  const stages = await prisma.packageStage.findMany({
    where: { packageId },
    orderBy: { sequenceNo: "asc" },
  });
  const next = stages.find((s) => s.status === "NOT_STARTED");
  if (next) {
    await prisma.packageStage.update({
      where: { id: next.id },
      data: { status: "IN_PROGRESS", startAt: new Date() },
    });
    return next.stageCode as StageCode;
  }
  return null;
}

async function recalcPackage(packageId: string) {
  const stages = await prisma.packageStage.findMany({ where: { packageId } });
  const progress = computeProgress(
    stages.map((s) => ({ weight: Number(s.weight), status: s.status }))
  );
  const allCompleted = stages.every((s) => s.status === "COMPLETED");
  await prisma.procurementPackage.update({
    where: { id: packageId },
    data: {
      progressPercent: progress,
      status: allCompleted ? "SELESAI" : undefined,
    },
  });
}

export async function completeStageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireSession();
  const stageId = String(formData.get("stageId") ?? "");

  const stage = await prisma.packageStage.findUnique({
    where: { id: stageId },
    include: { documents: true, approvals: true, package: true },
  });
  if (!stage) return { error: "Tahapan tidak ditemukan." };
  if (!canActOnStage(session.role, stage.stageCode) || (session.role === "PPK" && stage.package.ppkUserId !== session.userId)) {
    return { error: "Anda tidak berwenang menyelesaikan tahap ini." };
  }
  if (stage.status === "COMPLETED") return { error: "Tahap sudah selesai." };

  const gate = canCompleteStage(stage.stageCode, stage.documents, stage.approvals, {
    requiresApprovalOverride: stage.stageCode === "REVIU" ? isHighValuePackage(stage.package) : undefined,
  });
  if (!gate.ok) {
    return {
      error: `Dokumen/persetujuan wajib belum lengkap: ${gate.missing.join(", ")}.`,
    };
  }

  await prisma.packageStage.update({
    where: { id: stageId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  const nextStageCode = await activateNextStage(stage.packageId);

  await prisma.procurementPackage.update({
    where: { id: stage.packageId },
    data: {
      status: nextStageCode
        ? STAGE_TO_PACKAGE_STATUS[nextStageCode]
        : STAGE_TO_PACKAGE_STATUS[stage.stageCode],
    },
  });

  await recalcPackage(stage.packageId);

  if (nextStageCode) {
    const nextActors = await prisma.user.findMany({
      where: {
        appointments: {
          some: { active: true, role: { code: { in: STAGE_ACTOR_ROLES[nextStageCode] } } },
        },
      },
      select: { id: true },
    });
    await notifyMany(
      nextActors.map((a) => a.id),
      {
        type: "GENERAL",
        title: "Tahap Baru Dimulai",
        message: `Paket ${stage.package.packageCode} memasuki tahap ${nextStageCode}.`,
        link: `/packages/${stage.packageId}`,
      }
    );
  }

  await writeAudit({
    userId: session.userId,
    entityType: "package_stage",
    entityId: stageId,
    action: "COMPLETE",
  });

  revalidatePath(`/packages/${stage.packageId}`);
  revalidatePath("/dashboard");
  return { success: "Tahap berhasil diselesaikan." };
}

export async function submitStageForApprovalAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK"]);
  const stageId = String(formData.get("stageId") ?? "");

  const stage = await prisma.packageStage.findUnique({
    where: { id: stageId },
    include: { package: true },
  });
  if (!stage || stage.stageCode !== "REVIU") return { error: "Tahap tidak valid." };
  if (stage.package.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  await prisma.packageStage.update({
    where: { id: stageId },
    data: { status: "WAITING_APPROVAL" },
  });

  const spiUsers = await prisma.user.findMany({
    where: { appointments: { some: { active: true, role: { code: "SPI" } } } },
    select: { id: true },
  });
  await notifyMany(
    spiUsers.map((u) => u.id),
    {
      type: "REVIEW_REQUEST",
      title: "Permintaan Reviu SPI",
      message: `Paket ${stage.package.packageCode} menunggu reviu berbasis risiko dari SPI.`,
      link: `/packages/${stage.packageId}`,
    }
  );

  await writeAudit({
    userId: session.userId,
    entityType: "package_stage",
    entityId: stageId,
    action: "SUBMIT_FOR_APPROVAL",
  });

  revalidatePath(`/packages/${stage.packageId}`);
  return { success: "Paket diajukan untuk reviu SPI." };
}

export async function decideStageApprovalAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["SPI"]);
  const stageId = String(formData.get("stageId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "APPROVED" | "REVISION" | "REJECTED";
  const notes = String(formData.get("notes") ?? "");

  if (!["APPROVED", "REVISION", "REJECTED"].includes(decision)) {
    return { error: "Keputusan tidak valid." };
  }
  if (decision !== "APPROVED" && !notes.trim()) {
    return { error: "Catatan wajib diisi untuk Perlu Perbaikan atau Ditolak." };
  }

  const stage = await prisma.packageStage.findUnique({
    where: { id: stageId },
    include: { package: true, documents: true, approvals: true },
  });
  if (!stage) return { error: "Tahap tidak ditemukan." };

  await prisma.stageApproval.create({
    data: { stageId, approverUserId: session.userId, decision, notes: notes || null },
  });

  if (decision === "APPROVED") {
    const gate = canCompleteStage(
      stage.stageCode,
      stage.documents,
      [...stage.approvals, { decision, decidedAt: new Date() }]
    );
    if (gate.ok) {
      await prisma.packageStage.update({
        where: { id: stageId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      const nextStageCode = await activateNextStage(stage.packageId);
      await prisma.procurementPackage.update({
        where: { id: stage.packageId },
        data: {
          status: (nextStageCode
            ? STAGE_TO_PACKAGE_STATUS[nextStageCode]
            : STAGE_TO_PACKAGE_STATUS[stage.stageCode]),
        },
      });
      await recalcPackage(stage.packageId);
    } else {
      await prisma.packageStage.update({ where: { id: stageId }, data: { status: "WAITING_DOCUMENT" } });
    }
  } else {
    await prisma.packageStage.update({ where: { id: stageId }, data: { status: "REVISION" } });
  }

  await notify({
    userId: stage.package.ppkUserId,
    type: decision === "APPROVED" ? "PACKAGE_APPROVED" : "PACKAGE_RETURNED",
    title: `Reviu SPI: ${decision}`,
    message: `Paket ${stage.package.packageCode} — keputusan reviu SPI: ${decision}.`,
    link: `/packages/${stage.packageId}`,
  });

  await writeAudit({
    userId: session.userId,
    entityType: "stage_approval",
    entityId: stageId,
    action: `REVIEW_${decision}`,
    newData: { notes },
  });

  revalidatePath(`/packages/${stage.packageId}`);
  revalidatePath("/dashboard");
  return { success: "Keputusan reviu tersimpan." };
}

export async function assignPejabatPengadaanAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK"]);
  const packageId = String(formData.get("packageId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const pkg = await prisma.procurementPackage.findUnique({ where: { id: packageId } });
  if (!pkg || pkg.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }
  if (!userId) return { error: "Pilih Pejabat Pengadaan." };

  await prisma.packageStage.updateMany({
    where: { packageId, stageCode: { in: ["PEMILIHAN", "EVALUASI", "NEGOSIASI"] } },
    data: { picUserId: userId },
  });

  await notify({
    userId,
    type: "GENERAL",
    title: "Penugasan Paket",
    message: `Anda ditugaskan sebagai Pejabat Pengadaan pada paket ${pkg.packageCode}.`,
    link: `/packages/${packageId}`,
  });

  await writeAudit({
    userId: session.userId,
    entityType: "procurement_package",
    entityId: packageId,
    action: "ASSIGN_PEJABAT_PENGADAAN",
    newData: { userId },
  });

  revalidatePath(`/packages/${packageId}`);
  return { success: "Pejabat Pengadaan berhasil ditugaskan." };
}

export async function cancelPackageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK", "ADMIN"]);
  const packageId = String(formData.get("packageId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Alasan pembatalan wajib diisi." };

  const pkg = await prisma.procurementPackage.findUnique({ where: { id: packageId } });
  if (!pkg) return { error: "Paket tidak ditemukan." };
  if (session.role === "PPK" && pkg.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  await prisma.$transaction([
    prisma.procurementPackage.update({
      where: { id: packageId },
      data: { status: "DIBATALKAN", cancelledReason: reason },
    }),
    prisma.packageStage.updateMany({
      where: { packageId, status: { notIn: ["COMPLETED"] } },
      data: { status: "CANCELLED" },
    }),
  ]);

  await writeAudit({
    userId: session.userId,
    entityType: "procurement_package",
    entityId: packageId,
    action: "CANCEL",
    newData: { reason },
  });

  revalidatePath(`/packages/${packageId}`);
  revalidatePath("/packages");
  return { success: "Paket dibatalkan." };
}
