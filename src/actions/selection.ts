"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notify";
import type { BidStatus } from "@/generated/prisma/enums";

export interface FormState {
  error?: string;
  success?: string;
}

async function assertPejabatOnPackage(userId: string, packageId: string) {
  const stage = await prisma.packageStage.findFirst({
    where: { packageId, stageCode: "PEMILIHAN", picUserId: userId },
  });
  return !!stage;
}

export async function inviteVendorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PEJABAT_PENGADAAN"]);
  const packageId = String(formData.get("packageId") ?? "");
  const vendorId = String(formData.get("vendorId") ?? "");

  if (!(await assertPejabatOnPackage(session.userId, packageId))) {
    return { error: "Anda tidak ditugaskan pada paket ini." };
  }
  if (!vendorId) return { error: "Pilih penyedia." };

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.verificationStatus !== "VERIFIED") {
    return { error: "Hanya penyedia terverifikasi yang dapat diundang." };
  }

  const exists = await prisma.procurementInvitation.findUnique({
    where: { packageId_vendorId: { packageId, vendorId } },
  });
  if (exists) return { error: "Penyedia sudah diundang." };

  await prisma.procurementInvitation.create({
    data: {
      packageId,
      vendorId,
      deadlineAt: formData.get("deadlineAt")
        ? new Date(String(formData.get("deadlineAt")))
        : null,
    },
  });

  const vendorUsers = await prisma.vendorUser.findMany({ where: { vendorId } });
  const pkg = await prisma.procurementPackage.findUnique({ where: { id: packageId } });
  await notifyMany(
    vendorUsers.map((v) => v.userId),
    {
      type: "GENERAL",
      title: "Undangan Pemilihan Penyedia",
      message: `Anda diundang pada paket ${pkg?.packageCode}.`,
      link: "/vendor/invitations",
    }
  );

  await writeAudit({
    userId: session.userId,
    entityType: "procurement_invitation",
    entityId: packageId,
    action: "INVITE",
    newData: { vendorId },
  });

  revalidatePath(`/packages/${packageId}`);
  return { success: "Undangan terkirim." };
}

export async function submitBidAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PENYEDIA"]);
  const packageId = String(formData.get("packageId") ?? "");
  const offeredValue = Number(formData.get("offeredValue") ?? 0);

  if (!session.vendorId) return { error: "Data penyedia tidak ditemukan." };
  const invited = await prisma.procurementInvitation.findUnique({
    where: { packageId_vendorId: { packageId, vendorId: session.vendorId } },
  });
  if (!invited) return { error: "Anda tidak diundang pada paket ini." };
  if (!offeredValue) return { error: "Nilai penawaran wajib diisi." };

  await prisma.bid.upsert({
    where: { packageId_vendorId: { packageId, vendorId: session.vendorId } },
    update: { offeredValue, status: "SUBMITTED", submittedAt: new Date() },
    create: {
      packageId,
      vendorId: session.vendorId,
      offeredValue,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  await prisma.procurementInvitation.update({
    where: { packageId_vendorId: { packageId, vendorId: session.vendorId } },
    data: { responded: true },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "bid",
    entityId: packageId,
    action: "SUBMIT_BID",
    newData: { offeredValue },
  });

  revalidatePath("/vendor/bids");
  revalidatePath(`/packages/${packageId}`);
  return { success: "Penawaran terkirim." };
}

export async function evaluateBidAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PEJABAT_PENGADAAN"]);
  const bidId = String(formData.get("bidId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const result = String(formData.get("result") ?? "");
  const notes = String(formData.get("notes") ?? "");

  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { package: true } });
  if (!bid) return { error: "Penawaran tidak ditemukan." };
  if (!(await assertPejabatOnPackage(session.userId, bid.packageId))) {
    return { error: "Anda tidak ditugaskan pada paket ini." };
  }

  await prisma.evaluation.create({
    data: { bidId, stage, result, notes: notes || null },
  });

  const statusMap: Record<string, BidStatus> = {
    ADMINISTRASI: result === "LULUS" ? "ADMINISTRATION_PASSED" : "ADMINISTRATION_FAILED",
    TEKNIS: result === "LULUS" ? "TECHNICAL_PASSED" : "TECHNICAL_FAILED",
    HARGA: "PRICE_EVALUATED",
  };
  const newStatus = statusMap[stage];
  if (newStatus) {
    await prisma.bid.update({ where: { id: bidId }, data: { status: newStatus } });
  }

  await writeAudit({
    userId: session.userId,
    entityType: "evaluation",
    entityId: bidId,
    action: `EVALUATE_${stage}`,
    newData: { result, notes },
  });

  revalidatePath(`/packages/${bid.packageId}`);
  return { success: "Hasil evaluasi tersimpan." };
}

export async function setBidWinnerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PEJABAT_PENGADAAN"]);
  const bidId = String(formData.get("bidId") ?? "");

  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { package: true } });
  if (!bid) return { error: "Penawaran tidak ditemukan." };
  if (!(await assertPejabatOnPackage(session.userId, bid.packageId))) {
    return { error: "Anda tidak ditugaskan pada paket ini." };
  }

  await prisma.$transaction([
    prisma.bid.updateMany({
      where: { packageId: bid.packageId, NOT: { id: bidId } },
      data: { status: "LOSER" },
    }),
    prisma.bid.update({ where: { id: bidId }, data: { status: "WINNER" } }),
  ]);

  await notify({
    userId: bid.package.ppkUserId,
    type: "GENERAL",
    title: "Pemenang Ditetapkan",
    message: `Pemenang pemilihan untuk paket ${bid.package.packageCode} telah ditetapkan.`,
    link: `/packages/${bid.packageId}`,
  });

  await writeAudit({
    userId: session.userId,
    entityType: "bid",
    entityId: bidId,
    action: "SET_WINNER",
  });

  revalidatePath(`/packages/${bid.packageId}`);
  return { success: "Pemenang ditetapkan." };
}
