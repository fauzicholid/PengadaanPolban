"use client";

import { useActionState } from "react";
import { createRupAction, importRupBatchAction, type FormState, type ImportState } from "@/actions/rup";
import { Button } from "@/components/ui";

const initialState: FormState = {};
const initialImportState: ImportState = {};

export function ImportRupCsvForm() {
  const [state, formAction, pending] = useActionState(importRupBatchAction, initialImportState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Berkas CSV</label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
        <p className="mt-1.5 text-xs text-slate-400">
          Kolom wajib: work_unit_code, external_rup_id, fiscal_year, package_name, budget_ceiling.
          Kolom opsional: procurement_type, procurement_method, source_fund, location, volume, schedule.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      ) : null}
      {state.skipped && state.skipped.length > 0 ? (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <p className="font-medium">{state.skipped.length} baris dilewati:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {state.skipped.slice(0, 10).map((s, i) => (
              <li key={i}>
                Baris {s.row}: {s.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Mengimpor..." : "Impor CSV"}
      </Button>
    </form>
  );
}

export function RupForm({ workUnits }: { workUnits: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createRupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="RUP ID Eksternal" name="externalRupId" required placeholder="RUP-2026-000123" />
        <Field label="Tahun Anggaran" name="fiscalYear" type="number" required defaultValue={new Date().getFullYear()} />
      </div>
      <Field label="Nama Paket" name="packageName" required placeholder="Pengadaan Peralatan Laboratorium Teknik" />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Unit Kerja</label>
        <select
          name="workUnitId"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          <option value="">Pilih unit kerja</option>
          {workUnits.map((wu) => (
            <option key={wu.id} value={wu.id}>
              {wu.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis Pengadaan" name="procurementType" placeholder="Barang / Pekerjaan Konstruksi / Jasa Konsultansi / Jasa Lainnya" />
        <Field label="Cara Pengadaan" name="procurementMethod" placeholder="Tender / Pengadaan Langsung / dll." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pagu Anggaran (Rp)" name="budgetCeiling" type="number" required />
        <Field label="Sumber Dana" name="sourceFund" placeholder="BLU / RM / PNBP" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lokasi" name="location" />
        <Field label="Volume" name="volume" placeholder="1 paket" />
      </div>
      <Field label="Perkiraan Jadwal" name="schedule" placeholder="Triwulan I 2026" />

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan RUP"}
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
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
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
