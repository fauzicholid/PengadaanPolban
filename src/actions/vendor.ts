"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notify";
import { setSessionCookie } from "@/lib/session";

export interface FormState {
  error?: string;
  success?: string;
}

export async function registerVendorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PENYEDIA"]);
  if (session.vendorId) {
    return { error: "Akun ini sudah terhubung dengan data penyedia." };
  }

  const nib = String(formData.get("nib") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  if (!nib || !companyName) {
    return { error: "NIB dan nama badan usaha wajib diisi." };
  }

  const dupe = await prisma.vendor.findUnique({ where: { nib } });
  if (dupe) {
    return { error: "NIB sudah terdaftar pada sistem." };
  }

  const vendor = await prisma.vendor.create({
    data: {
      nib,
      companyName,
      npwp: String(formData.get("npwp") ?? "") || null,
      companyType: String(formData.get("companyType") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      directorName: String(formData.get("directorName") ?? "") || null,
      verificationStatus: "DRAFT",
      users: { create: { userId: session.userId } },
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "vendor",
    entityId: vendor.id,
    action: "REGISTER",
    newData: { nib, companyName },
  });

  await setSessionCookie({ ...session, vendorId: vendor.id });

  revalidatePath("/vendor/profile");
  redirect("/vendor/profile");
}

export async function updateVendorProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) return { error: "Data penyedia tidak ditemukan." };

  const vendor = await prisma.vendor.findUnique({ where: { id: session.vendorId } });
  if (!vendor) return { error: "Data penyedia tidak ditemukan." };
  if (vendor.verificationStatus === "VERIFIED") {
    return { error: "Profil yang sudah terverifikasi tidak dapat diubah langsung." };
  }

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      companyName: String(formData.get("companyName") ?? vendor.companyName),
      companyType: String(formData.get("companyType") ?? "") || null,
      npwp: String(formData.get("npwp") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      directorName: String(formData.get("directorName") ?? "") || null,
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "vendor",
    entityId: vendor.id,
    action: "UPDATE_PROFILE",
  });

  revalidatePath("/vendor/profile");
  return { success: "Profil berhasil diperbarui." };
}

export async function addVendorKbliAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) return { error: "Data penyedia tidak ditemukan." };

  const kbliId = String(formData.get("kbliId") ?? "");
  if (!kbliId) return { error: "Pilih kode KBLI." };

  const exists = await prisma.vendorKbli.findUnique({
    where: { vendorId_kbliId: { vendorId: session.vendorId, kbliId } },
  });
  if (exists) return { error: "KBLI tersebut sudah ditambahkan." };

  await prisma.vendorKbli.create({
    data: {
      vendorId: session.vendorId,
      kbliId,
      licenseStatus: String(formData.get("licenseStatus") ?? "") || null,
    },
  });

  revalidatePath("/vendor/profile");
  return { success: "KBLI ditambahkan." };
}

export async function removeVendorKbliAction(vendorKbliId: string) {
  const session = await requireRole(["PENYEDIA"]);
  const link = await prisma.vendorKbli.findUnique({ where: { id: vendorKbliId } });
  if (!link || link.vendorId !== session.vendorId) return;
  await prisma.vendorKbli.delete({ where: { id: vendorKbliId } });
  revalidatePath("/vendor/profile");
}

export async function uploadVendorDocumentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) return { error: "Data penyedia tidak ditemukan." };

  const documentType = String(formData.get("documentType") ?? "").trim();
  const fileUri = String(formData.get("fileUri") ?? "").trim();
  if (!documentType || !fileUri) {
    return { error: "Jenis dokumen dan tautan/nama berkas wajib diisi." };
  }

  await prisma.vendorLegalDocument.create({
    data: {
      vendorId: session.vendorId,
      documentType,
      documentNumber: String(formData.get("documentNumber") ?? "") || null,
      issuedAt: formData.get("issuedAt") ? new Date(String(formData.get("issuedAt"))) : null,
      expiresAt: formData.get("expiresAt") ? new Date(String(formData.get("expiresAt"))) : null,
      fileUri,
      checksum: `sha256-${Buffer.from(fileUri + Date.now()).toString("hex").slice(0, 16)}`,
      status: "UPLOADED",
      uploadedById: session.userId,
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "vendor_legal_document",
    entityId: session.vendorId,
    action: "UPLOAD",
    newData: { documentType },
  });

  revalidatePath("/vendor/profile");
  return { success: "Dokumen berhasil diunggah." };
}

export async function submitVendorForVerificationAction(
  _prev: FormState,
  _formData: FormData
): Promise<FormState> {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) return { error: "Data penyedia tidak ditemukan." };

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    include: { kbli: true, legalDocuments: true },
  });
  if (!vendor) return { error: "Data penyedia tidak ditemukan." };

  if (!vendor.npwp || vendor.kbli.length === 0 || vendor.legalDocuments.length === 0) {
    return {
      error:
        "Lengkapi NPWP, minimal satu KBLI, dan minimal satu dokumen legalitas sebelum mengajukan verifikasi.",
    };
  }

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: { verificationStatus: "SUBMITTED" },
  });

  const admins = await prisma.user.findMany({
    where: { appointments: { some: { role: { code: "ADMIN" }, active: true } } },
    select: { id: true },
  });
  await notifyMany(
    admins.map((a) => a.id),
    {
      type: "VENDOR_VERIFICATION",
      title: "Permintaan Verifikasi Penyedia",
      message: `${vendor.companyName} mengajukan verifikasi.`,
      link: `/vendors/${vendor.id}`,
    }
  );

  await writeAudit({
    userId: session.userId,
    entityType: "vendor",
    entityId: vendor.id,
    action: "SUBMIT_VERIFICATION",
    newData: { status: "SUBMITTED" },
  });

  revalidatePath("/vendor/profile");
  revalidatePath("/vendors");
  return { success: "Pengajuan verifikasi terkirim." };
}

export async function decideVendorVerificationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN"]);
  const vendorId = String(formData.get("vendorId") ?? "");
  const decision = String(formData.get("decision") ?? "") as
    | "VERIFIED"
    | "REVISION"
    | "REJECTED";
  const notes = String(formData.get("notes") ?? "");

  if (!vendorId || !["VERIFIED", "REVISION", "REJECTED"].includes(decision)) {
    return { error: "Keputusan tidak valid." };
  }
  if ((decision === "REVISION" || decision === "REJECTED") && !notes.trim()) {
    return { error: "Catatan wajib diisi untuk Perlu Perbaikan atau Ditolak." };
  }

  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      verificationStatus: decision === "VERIFIED" ? "VERIFIED" : decision,
      verifications: {
        create: { verifierId: session.userId, decision, notes: notes || null },
      },
    },
    include: { users: true },
  });

  await notifyMany(
    vendor.users.map((u) => u.userId),
    {
      type: "VENDOR_VERIFICATION",
      title: "Hasil Verifikasi Penyedia",
      message: `Status verifikasi ${vendor.companyName}: ${decision}.`,
      link: "/vendor/profile",
    }
  );

  await writeAudit({
    userId: session.userId,
    entityType: "vendor",
    entityId: vendor.id,
    action: `VERIFICATION_${decision}`,
    newData: { decision, notes },
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
  return { success: "Keputusan verifikasi tersimpan." };
}
