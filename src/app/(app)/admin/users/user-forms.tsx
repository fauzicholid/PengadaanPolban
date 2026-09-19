"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { createUserAction, toggleUserStatusAction, type FormState } from "@/actions/admin";
import { ROLE_LABELS } from "@/lib/constants";
import type { RoleCode } from "@/generated/prisma/enums";

const empty: FormState = {};

export function CreateUserForm({
  roles,
  workUnits,
}: {
  roles: RoleCode[];
  workUnits: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createUserAction, empty);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nama Lengkap</label>
          <input name="fullName" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <input name="email" type="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Peran</label>
          <select name="roleCode" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Pilih peran</option>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Unit Kerja</label>
          <select name="workUnitId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Pilih unit kerja</option>
            {workUnits.map((wu) => (
              <option key={wu.id} value={wu.id}>{wu.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nomor SK Penugasan</label>
        <input name="skNumber" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Tambah Pengguna"}</Button>
    </form>
  );
}

export function ToggleStatusButton({ userId, status }: { userId: string; status: string }) {
  return (
    <form action={toggleUserStatusAction.bind(null, userId)}>
      <button type="submit" className="text-xs font-medium text-blue-700 hover:underline">
        {status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </form>
  );
}
