"use client";

import { useActionState, useMemo, useState } from "react";
import { createPackageFromRupAction, type FormState } from "@/actions/package";
import { Button } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { ProcurementTypeMethodFields } from "@/components/procurement-type-method-fields";

const initialState: FormState = {};

interface RupOption {
  id: string;
  externalRupId: string;
  packageName: string;
  budgetCeiling: string;
  fiscalYear: number;
  procurementType: string | null;
  procurementMethod: string | null;
}

export function PackageForm({
  rups,
  defaultRupId,
}: {
  rups: RupOption[];
  defaultRupId?: string;
}) {
  const [state, formAction, pending] = useActionState(createPackageFromRupAction, initialState);
  const [rupId, setRupId] = useState(defaultRupId ?? "");
  const selectedRup = useMemo(() => rups.find((r) => r.id === rupId), [rups, rupId]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">RUP</label>
        <select
          name="rupId"
          required
          value={rupId}
          onChange={(e) => setRupId(e.target.value)}
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
      <ProcurementTypeMethodFields
        key={rupId}
        defaultType={selectedRup?.procurementType ?? ""}
        defaultMethod={selectedRup?.procurementMethod ?? ""}
        budgetCeiling={selectedRup ? Number(selectedRup.budgetCeiling) : null}
      />
      <p className="text-[11px] text-slate-400">
        Terisi otomatis dari RUP yang dipilih; ubah bila metode final berbeda saat persiapan paket.
      </p>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Membuat..." : "Buat Paket"}
      </Button>
    </form>
  );
}
