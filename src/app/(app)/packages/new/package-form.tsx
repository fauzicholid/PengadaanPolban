"use client";

import { useActionState } from "react";
import { createPackageFromRupAction, type FormState } from "@/actions/package";
import { Button } from "@/components/ui";
import { formatRupiah } from "@/lib/format";

const initialState: FormState = {};

interface RupOption {
  id: string;
  externalRupId: string;
  packageName: string;
  budgetCeiling: string;
  fiscalYear: number;
}

export function PackageForm({
  rups,
  defaultRupId,
}: {
  rups: RupOption[];
  defaultRupId?: string;
}) {
  const [state, formAction, pending] = useActionState(createPackageFromRupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">RUP</label>
        <select
          name="rupId"
          required
          defaultValue={defaultRupId}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          <option value="">Pilih RUP</option>
          {rups.map((r) => (
            <option key={r.id} value={r.id}>
              {r.externalRupId} · {r.packageName} · {formatRupiah(r.budgetCeiling)} (TA {r.fiscalYear})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nama Paket <span className="text-red-500">*</span>
        </label>
        <input
          name="packageName"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Jenis Pengadaan</label>
        <input
          name="procurementType"
          placeholder="Barang / Pekerjaan Konstruksi / Jasa Konsultansi / Jasa Lainnya"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Membuat..." : "Buat Paket"}
      </Button>
    </form>
  );
}
