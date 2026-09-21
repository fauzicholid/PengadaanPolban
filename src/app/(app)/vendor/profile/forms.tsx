"use client";

import { useActionState } from "react";
import {
  registerVendorAction,
  updateVendorProfileAction,
  addVendorKbliAction,
  removeVendorKbliAction,
  uploadVendorDocumentAction,
  submitVendorForVerificationAction,
  type FormState,
} from "@/actions/vendor";
import { Button } from "@/components/ui";

const initialState: FormState = {};

export function RegisterVendorForm() {
  const [state, formAction, pending] = useActionState(registerVendorAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NIB" name="nib" required />
        <Field label="NPWP" name="npwp" />
      </div>
      <Field label="Nama Badan Usaha" name="companyName" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bentuk Badan Usaha" name="companyType" placeholder="PT / CV / Perorangan" />
        <Field label="Pimpinan/Direktur" name="directorName" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" />
        <Field label="Telepon" name="phone" />
      </div>
      <Field label="Alamat" name="address" />
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Daftar Sebagai Penyedia"}</Button>
    </form>
  );
}

export function ProfileForm({ vendor }: { vendor: Record<string, string | null> }) {
  const [state, formAction, pending] = useActionState(updateVendorProfileAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Badan Usaha" name="companyName" defaultValue={vendor.companyName ?? ""} required />
        <Field label="Bentuk Badan Usaha" name="companyType" defaultValue={vendor.companyType ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NPWP" name="npwp" defaultValue={vendor.npwp ?? ""} />
        <Field label="Pimpinan/Direktur" name="directorName" defaultValue={vendor.directorName ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" defaultValue={vendor.email ?? ""} />
        <Field label="Telepon" name="phone" defaultValue={vendor.phone ?? ""} />
      </div>
      <Field label="Alamat" name="address" defaultValue={vendor.address ?? ""} />
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan Profil"}</Button>
    </form>
  );
}

export function KbliForm({ options }: { options: { id: string; code: string; title: string }[] }) {
  const [state, formAction, pending] = useActionState(addVendorKbliAction, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Kode KBLI</label>
        <select
          name="kbliId"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          <option value="">Pilih KBLI</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code} — {o.title}
            </option>
          ))}
        </select>
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-600">Status Izin</label>
        <input
          name="licenseStatus"
          placeholder="Berlaku"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>Tambah</Button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function RemoveKbliButton({ vendorKbliId }: { vendorKbliId: string }) {
  const [state, formAction, pending] = useActionState(removeVendorKbliAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="vendorKbliId" value={vendorKbliId} />
      <button className="text-xs text-red-600 hover:underline disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error ? <p className="mt-1 text-[11px] text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function DocumentForm() {
  const [state, formAction, pending] = useActionState(uploadVendorDocumentAction, initialState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label="Jenis Dokumen" name="documentType" placeholder="NIB / Akta / Izin Usaha" required />
      <Field label="Nomor Dokumen" name="documentNumber" />
      <Field label="Tanggal Terbit" name="issuedAt" type="date" />
      <Field label="Masa Berlaku" name="expiresAt" type="date" />
      <div className="sm:col-span-2">
        <Field label="Nama Berkas / Tautan" name="fileUri" placeholder="izin-usaha.pdf" required />
      </div>
      {state.error ? <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p> : null}
      {state.success ? <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Mengunggah..." : "Unggah Dokumen"}</Button>
      </div>
    </form>
  );
}

export function SubmitVerificationButton() {
  const [state, formAction, pending] = useActionState(submitVendorForVerificationAction, initialState);
  return (
    <form action={formAction} className="space-y-2">
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Mengajukan..." : "Ajukan Verifikasi"}</Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
    </div>
  );
}
