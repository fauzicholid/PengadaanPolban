"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export interface FormState {
  error?: string;
}

export async function createRupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN", "PPK"]);

  const workUnitId = String(formData.get("workUnitId") ?? "");
  const externalRupId = String(formData.get("externalRupId") ?? "").trim();
  const fiscalYear = Number(formData.get("fiscalYear"));
  const packageName = String(formData.get("packageName") ?? "").trim();
  const procurementType = String(formData.get("procurementType") ?? "");
  const procurementMethod = String(formData.get("procurementMethod") ?? "");
  const budgetCeiling = Number(formData.get("budgetCeiling") ?? 0);
  const sourceFund = String(formData.get("sourceFund") ?? "");
  const location = String(formData.get("location") ?? "");
  const volume = String(formData.get("volume") ?? "");
  const schedule = String(formData.get("schedule") ?? "");

  if (!workUnitId || !externalRupId || !fiscalYear || !packageName) {
    return { error: "Unit kerja, RUP ID, tahun anggaran, dan nama paket wajib diisi." };
  }

  const existing = await prisma.rup.findUnique({
    where: { externalRupId_fiscalYear: { externalRupId, fiscalYear } },
  });
  if (existing) {
    return { error: "RUP dengan ID eksternal dan tahun anggaran tersebut sudah terdaftar." };
  }

  const rup = await prisma.rup.create({
    data: {
      workUnitId,
      externalRupId,
      fiscalYear,
      packageName,
      procurementType: procurementType || null,
      procurementMethod: procurementMethod || null,
      budgetCeiling,
      sourceFund: sourceFund || null,
      location: location || null,
      volume: volume || null,
      schedule: schedule || null,
      source: "MANUAL_IMPORT",
      syncAt: new Date(),
    },
  });

  await prisma.integrationLog.create({
    data: {
      service: "SIRUP",
      direction: "IMPORT",
      status: "SUCCESS",
      payload: { externalRupId, fiscalYear, packageName },
      message: `Impor manual RUP oleh ${session.fullName}`,
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "rup",
    entityId: rup.id,
    action: "IMPORT",
    newData: { externalRupId, fiscalYear, packageName, budgetCeiling },
  });

  revalidatePath("/rup");
  redirect("/rup");
}
