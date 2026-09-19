"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { createKbliAction, type FormState } from "@/actions/admin";

const empty: FormState = {};

export function KbliForm() {
  const [state, formAction, pending] = useActionState(createKbliAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-slate-600">Kode</label>
        <input name="code" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Nama</label>
        <input name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-xs font-medium text-slate-600">Versi</label>
        <input name="version" required placeholder="2020" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Menyimpan..." : "Tambah"}</Button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
      {state.success ? <p className="w-full text-xs text-emerald-600">{state.success}</p> : null}
    </form>
  );
}
