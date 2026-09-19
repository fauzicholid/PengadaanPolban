"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      appointments: {
        where: { active: true },
        include: { role: true, workUnit: true },
        orderBy: { validFrom: "desc" },
      },
      vendorUsers: { include: { vendor: true } },
    },
  });

  if (!user || user.status !== "ACTIVE") {
    if (user) {
      await writeAudit({
        userId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "LOGIN_FAILED",
        newData: { email, reason: "inactive_or_not_found" },
      });
    }
    return { error: "Email atau kata sandi salah, atau akun tidak aktif." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await writeAudit({
      userId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "LOGIN_FAILED",
      newData: { email, reason: "wrong_password" },
    });
    return { error: "Email atau kata sandi salah." };
  }

  const appointment = user.appointments[0];
  const vendorLink = user.vendorUsers[0];

  if (!appointment && !vendorLink) {
    return { error: "Akun belum memiliki penugasan peran aktif. Hubungi Admin." };
  }

  const role = appointment ? appointment.role.code : "PENYEDIA";

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    workUnitId: appointment?.workUnitId ?? null,
    workUnitName: appointment?.workUnit.name ?? null,
    vendorId: vendorLink?.vendorId ?? null,
  });

  await writeAudit({
    userId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "LOGIN",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
