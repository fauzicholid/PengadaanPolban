"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";

export interface FormState {
  error?: string;
}

export interface ImportState {
  error?: string;
  success?: string;
  imported?: number;
  skipped?: { row: number; reason: string }[];
}

const REQUIRED_COLUMNS = ["work_unit_code", "external_rup_id", "fiscal_year", "package_name", "budget_ceiling"];

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

export async function importRupBatchAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const session = await requireRole(["ADMIN", "PPK"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih berkas CSV terlebih dahulu." };
  }
  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingColumns.length > 0) {
    return {
      error: `Kolom wajib tidak ditemukan pada header CSV: ${missingColumns.join(", ")}.`,
    };
  }
  if (rows.length === 0) {
    return { error: "Berkas CSV tidak berisi data." };
  }

  const workUnits = await prisma.workUnit.findMany();
  const workUnitByCode = new Map(workUnits.map((w) => [w.code.toLowerCase(), w]));

  const skipped: { row: number; reason: string }[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNo = i + 2; // account for header row, 1-indexed

    const workUnitCode = row["work_unit_code"]?.trim();
    const externalRupId = row["external_rup_id"]?.trim();
    const fiscalYear = Number(row["fiscal_year"]);
    const packageName = row["package_name"]?.trim();
    const budgetCeiling = Number(row["budget_ceiling"] || 0);

    if (!workUnitCode || !externalRupId || !fiscalYear || !packageName) {
      skipped.push({ row: rowNo, reason: "Kolom wajib kosong atau tidak valid." });
      continue;
    }
    const workUnit = workUnitByCode.get(workUnitCode.toLowerCase());
    if (!workUnit) {
      skipped.push({ row: rowNo, reason: `Kode unit kerja "${workUnitCode}" tidak dikenal.` });
      continue;
    }
    if (Number.isNaN(budgetCeiling)) {
      skipped.push({ row: rowNo, reason: "Pagu anggaran tidak valid." });
      continue;
    }

    await prisma.rup.upsert({
      where: { externalRupId_fiscalYear: { externalRupId, fiscalYear } },
      update: {
        workUnitId: workUnit.id,
        packageName,
        procurementType: row["procurement_type"]?.trim() || null,
        procurementMethod: row["procurement_method"]?.trim() || null,
        budgetCeiling,
        sourceFund: row["source_fund"]?.trim() || null,
        location: row["location"]?.trim() || null,
        volume: row["volume"]?.trim() || null,
        schedule: row["schedule"]?.trim() || null,
        source: "MANUAL_IMPORT",
        syncAt: new Date(),
      },
      create: {
        workUnitId: workUnit.id,
        externalRupId,
        fiscalYear,
        packageName,
        procurementType: row["procurement_type"]?.trim() || null,
        procurementMethod: row["procurement_method"]?.trim() || null,
        budgetCeiling,
        sourceFund: row["source_fund"]?.trim() || null,
        location: row["location"]?.trim() || null,
        volume: row["volume"]?.trim() || null,
        schedule: row["schedule"]?.trim() || null,
        source: "MANUAL_IMPORT",
        syncAt: new Date(),
      },
    });
    imported += 1;
  }

  await prisma.integrationLog.create({
    data: {
      service: "SIRUP",
      direction: "IMPORT",
      status: skipped.length === 0 ? "SUCCESS" : "PARTIAL",
      payload: { totalRows: rows.length, imported, skipped: skipped.length },
      message: `Impor massal CSV RUP oleh ${session.fullName}: ${imported} berhasil, ${skipped.length} dilewati.`,
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "rup",
    entityId: "batch",
    action: "IMPORT_BATCH",
    newData: { totalRows: rows.length, imported, skipped: skipped.length },
  });

  revalidatePath("/rup");

  if (imported === 0) {
    return { error: "Tidak ada baris yang berhasil diimpor.", skipped };
  }

  return {
    success: `${imported} data RUP berhasil diimpor.`,
    imported,
    skipped,
  };
}
