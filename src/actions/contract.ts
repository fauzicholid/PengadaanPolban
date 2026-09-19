"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export interface FormState {
  error?: string;
  success?: string;
}

export async function createContractAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK"]);
  const packageId = String(formData.get("packageId") ?? "");
  const contractNumber = String(formData.get("contractNumber") ?? "").trim();
  const contractValue = Number(formData.get("contractValue") ?? 0);
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  const pkg = await prisma.procurementPackage.findUnique({
    where: { id: packageId },
    include: { bids: { where: { status: "WINNER" } } },
  });
  if (!pkg || pkg.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }
  const winner = pkg.bids[0];
  if (!winner) return { error: "Belum ada pemenang pemilihan untuk paket ini." };
  if (!contractNumber || !contractValue || !startDate || !endDate) {
    return { error: "Semua kolom kontrak wajib diisi." };
  }

  const contract = await prisma.contract.create({
    data: {
      packageId,
      vendorId: winner.vendorId,
      contractNumber,
      contractValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "ACTIVE",
    },
  });

  await prisma.procurementPackage.update({
    where: { id: packageId },
    data: { contractValue },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "contract",
    entityId: contract.id,
    action: "CREATE",
    newData: { contractNumber, contractValue },
  });

  revalidatePath(`/packages/${packageId}`);
  return { success: "Kontrak berhasil dibuat." };
}

export async function addMilestoneAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK", "STAF_PPK"]);
  const contractId = String(formData.get("contractId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "");

  if (!name || !targetDate) return { error: "Nama milestone dan target tanggal wajib diisi." };

  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { package: true } });
  if (!contract) return { error: "Kontrak tidak ditemukan." };
  if (session.role === "PPK" && contract.package.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  await prisma.contractMilestone.create({
    data: { contractId, name, targetDate: new Date(targetDate) },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "contract_milestone",
    entityId: contractId,
    action: "CREATE",
    newData: { name, targetDate },
  });

  revalidatePath(`/packages/${contract.packageId}`);
  return { success: "Milestone ditambahkan." };
}

export async function updateMilestoneProgressAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK", "STAF_PPK"]);
  const milestoneId = String(formData.get("milestoneId") ?? "");
  const progressPercent = Number(formData.get("progressPercent") ?? 0);
  const notes = String(formData.get("notes") ?? "");

  const milestone = await prisma.contractMilestone.findUnique({
    where: { id: milestoneId },
    include: { contract: { include: { package: true } } },
  });
  if (!milestone) return { error: "Milestone tidak ditemukan." };
  if (session.role === "PPK" && milestone.contract.package.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  await prisma.contractMilestone.update({
    where: { id: milestoneId },
    data: {
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      notes: notes || null,
      completedAt: progressPercent >= 100 ? new Date() : null,
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "contract_milestone",
    entityId: milestoneId,
    action: "UPDATE_PROGRESS",
    newData: { progressPercent },
  });

  revalidatePath(`/packages/${milestone.contract.packageId}`);
  return { success: "Progres milestone diperbarui." };
}

export async function addAddendumAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PPK"]);
  const contractId = String(formData.get("contractId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const changes = String(formData.get("changes") ?? "").trim();
  const newValue = formData.get("newValue") ? Number(formData.get("newValue")) : null;
  const newEndDate = formData.get("newEndDate") ? String(formData.get("newEndDate")) : null;

  if (!reason || !changes) return { error: "Alasan dan perubahan wajib diisi." };

  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { package: true } });
  if (!contract || contract.package.ppkUserId !== session.userId) {
    return { error: "Anda bukan PPK penanggung jawab paket ini." };
  }

  await prisma.$transaction([
    prisma.contractAddendum.create({
      data: {
        contractId,
        reason,
        changes,
        newValue,
        newEndDate: newEndDate ? new Date(newEndDate) : null,
      },
    }),
    prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "ADDENDUM",
        contractValue: newValue ?? undefined,
        endDate: newEndDate ? new Date(newEndDate) : undefined,
      },
    }),
  ]);

  await notify({
    userId: contract.package.ppkUserId,
    type: "GENERAL",
    title: "Addendum Kontrak",
    message: `Addendum tercatat pada kontrak ${contract.contractNumber}.`,
    link: `/packages/${contract.packageId}`,
  });

  await writeAudit({
    userId: session.userId,
    entityType: "contract_addendum",
    entityId: contractId,
    action: "CREATE",
    newData: { reason, changes, newValue },
  });

  revalidatePath(`/packages/${contract.packageId}`);
  return { success: "Addendum tersimpan." };
}
