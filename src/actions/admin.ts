"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { RoleCode } from "@/generated/prisma/enums";

export interface FormState {
  error?: string;
  success?: string;
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN"]);
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleCode = String(formData.get("roleCode") ?? "") as RoleCode;
  const workUnitId = String(formData.get("workUnitId") ?? "");
  const skNumber = String(formData.get("skNumber") ?? "");

  if (!fullName || !email || !roleCode || !workUnitId) {
    return { error: "Nama, email, peran, dan unit kerja wajib diisi." };
  }

  const dupe = await prisma.user.findUnique({ where: { email } });
  if (dupe) return { error: "Email sudah terdaftar." };

  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) return { error: "Peran tidak valid." };

  const passwordHash = await bcrypt.hash("polban123", 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      appointments: {
        create: {
          roleId: role.id,
          workUnitId,
          skNumber: skNumber || null,
          validFrom: new Date(),
          active: true,
        },
      },
    },
  });

  await writeAudit({
    userId: session.userId,
    entityType: "user",
    entityId: user.id,
    action: "CREATE",
    newData: { email, roleCode },
  });

  revalidatePath("/admin/users");
  return { success: "Pengguna berhasil dibuat. Kata sandi awal: polban123" };
}

export async function toggleUserStatusAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Pengguna tidak ditemukan." };
  const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  await prisma.user.update({ where: { id: userId }, data: { status: newStatus } });

  await writeAudit({
    userId: session.userId,
    entityType: "user",
    entityId: userId,
    action: `SET_STATUS_${newStatus}`,
  });

  revalidatePath("/admin/users");
  return {
    success: newStatus === "ACTIVE" ? "Pengguna berhasil diaktifkan." : "Pengguna berhasil dinonaktifkan.",
  };
}

export async function createKbliAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole(["ADMIN"]);
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();

  if (!code || !title || !version) return { error: "Kode, nama, dan versi wajib diisi." };

  const dupe = await prisma.kbliMaster.findUnique({ where: { code_version: { code, version } } });
  if (dupe) return { error: "Kombinasi kode dan versi KBLI sudah ada." };

  await prisma.kbliMaster.create({ data: { code, title, version } });

  await writeAudit({
    userId: session.userId,
    entityType: "kbli_master",
    action: "CREATE",
    newData: { code, title, version },
  });

  revalidatePath("/admin/kbli");
  return { success: "KBLI berhasil ditambahkan." };
}
