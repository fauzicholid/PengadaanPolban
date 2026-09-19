"use client";

import { useActionState } from "react";
import { publicRegisterVendorAction, type FormState } from "@/actions/vendor";
import { Button } from "@/components/ui";

const initialState: FormState = {};

export function PublicRegisterForm() {
  const [state, formAction, pending] = useActionState(publicRegisterVendorAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Akun Penyedia</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Penanggung Jawab" name="fullName" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Kata Sandi" name="password" type="password" required placeholder="Minimal 8 karakter" />
          <Field label="Konfirmasi Kata Sandi" name="confirmPassword" type="password" required />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Data Badan Usaha</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIB" name="nib" required />
          <Field label="NPWP" name="npwp" />
          <Field label="Nama Badan Usaha" name="companyName" required />
          <Field label="Bentuk Badan Usaha" name="companyType" placeholder="PT / CV / Perorangan" />
          <Field label="Email Perusahaan" name="companyEmail" type="email" placeholder="Kosongkan bila sama dengan email akun" />
          <Field label="Telepon" name="phone" />
          <Field label="Pimpinan/Direktur" name="directorName" />
        </div>
        <div className="mt-4">
          <Field label="Alamat" name="address" />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <p className="text-xs text-slate-500">
        Setelah mendaftar, lengkapi KBLI dan dokumen legalitas pada portal penyedia, lalu ajukan
        verifikasi. Staf PPK/Admin akan memverifikasi dan memvalidasi data perusahaan Anda, dan
        hasilnya akan dikirimkan melalui notifikasi aplikasi serta email.
      </p>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Mendaftarkan..." : "Daftar Sebagai Penyedia"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
    </div>
  );
}
