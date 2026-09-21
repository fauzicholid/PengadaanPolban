"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  uploadDocumentTemplateAction,
  deactivateDocumentTemplateAction,
  type FormState,
} from "@/actions/document-templates";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

const empty: FormState = {};

export function UploadTemplateForm({ documentTypes }: { documentTypes: string[] }) {
  const [state, formAction, pending] = useActionState(uploadDocumentTemplateAction, empty);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Jenis Dokumen</label>
          <select name="documentType" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Pilih jenis dokumen</option>
            {documentTypes.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nama Template</label>
          <input name="name" required placeholder="Template BA Reviu Standar" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Berkas .docx (tanpa kop surat)</label>
        <input
          name="file"
          type="file"
          accept=".docx"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Gunakan placeholder seperti {"{nama_paket}"}, {"{kode_paket}"}, {"{nomor_dokumen}"}, {"{tanggal}"} pada berkas .docx.
          Kop surat Polban akan ditambahkan otomatis oleh sistem, jadi berkas template tidak perlu memuat kop surat.
        </p>
      </div>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Mengunggah..." : "Unggah Template"}</Button>
    </form>
  );
}

export function DeactivateTemplateButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deactivateDocumentTemplateAction, empty);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
        {pending ? "Memproses..." : "Nonaktifkan"}
      </button>
      {state.error ? <p className="mt-1 text-[11px] text-red-600">{state.error}</p> : null}
    </form>
  );
}
