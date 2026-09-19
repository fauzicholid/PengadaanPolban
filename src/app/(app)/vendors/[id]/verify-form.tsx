"use client";

import { useActionState } from "react";
import { decideVendorVerificationAction, type FormState } from "@/actions/vendor";
import { Button } from "@/components/ui";

const initialState: FormState = {};

export function VerifyForm({ vendorId }: { vendorId: string }) {
  const [state, formAction, pending] = useActionState(
    decideVendorVerificationAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="vendorId" value={vendorId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Catatan</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Wajib diisi untuk keputusan Perlu Perbaikan/Ditolak"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="VERIFIED"
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Setujui / Terverifikasi
        </Button>
        <Button
          type="submit"
          name="decision"
          value="REVISION"
          variant="secondary"
          disabled={pending}
        >
          Perlu Perbaikan
        </Button>
        <Button type="submit" name="decision" value="REJECTED" variant="danger" disabled={pending}>
          Tolak
        </Button>
      </div>
    </form>
  );
}
