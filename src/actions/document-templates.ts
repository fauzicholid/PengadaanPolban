"use server";

import { revalidatePath } from "next/cache";
import PizZip from "pizzip";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  DOCUMENT_TYPE_LABELS,
  TEMPLATABLE_DOCUMENT_TYPES,
  type TemplatableDocumentType,
} from "@/lib/constants";

export interface FormState {
  error?: string;
  success?: string;
}

export async function uploadDocumentTemplateAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN"]);
  const documentType = String(formData.get("documentType") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file");

  if (!TEMPLATABLE_DOCUMENT_TYPES.includes(documentType as TemplatableDocumentType)) {
    return { error: "Jenis dokumen tidak valid." };
  }
  if (!name) return { error: "Nama template wajib diisi." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Berkas .docx wajib diunggah." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { error: "Berkas harus berformat .docx." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    new PizZip(buffer);
  } catch {
    return { error: "Berkas .docx tidak valid atau rusak." };
  }

  await prisma.$transaction([
    prisma.documentTemplate.updateMany({
      where: { documentType, active: true },
      data: { active: false },
    }),
    prisma.documentTemplate.create({
      data: {
        documentType,
        name,
        fileName: file.name,
        fileData: buffer,
        active: true,
        uploadedById: session.userId,
      },
    }),
  ]);

  await writeAudit({
    userId: session.userId,
    entityType: "document_template",
    action: "UPLOAD",
    newData: { documentType, name, fileName: file.name },
  });

  revalidatePath("/admin/templates");
  return {
    success: `Template ${DOCUMENT_TYPE_LABELS[documentType] ?? documentType} berhasil diunggah dan diaktifkan.`,
  };
}

export async function deactivateDocumentTemplateAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");

  const template = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!template) return { error: "Template tidak ditemukan." };
  if (!template.active) return { error: "Template sudah tidak aktif." };

  await prisma.documentTemplate.update({ where: { id }, data: { active: false } });

  await writeAudit({
    userId: session.userId,
    entityType: "document_template",
    entityId: id,
    action: "DEACTIVATE",
  });

  revalidatePath("/admin/templates");
  return { success: "Template dinonaktifkan. Dokumen berikutnya akan memakai format bawaan sistem." };
}
