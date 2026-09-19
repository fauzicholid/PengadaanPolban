"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  createReviewRequestAction,
  startReviewAction,
  addFindingAction,
  closeReviewAction,
  submitFollowupAction,
  verifyFollowupAction,
  startRiskBasedReviewAction,
  type FormState,
} from "@/actions/spi";

const empty: FormState = {};

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>;
  if (state.success) return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p>;
  return null;
}

export function CreateReviewRequestForm({ packages }: { packages: { id: string; packageCode: string; packageName: string }[] }) {
  const [state, formAction, pending] = useActionState(createReviewRequestAction, empty);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Paket</label>
        <select name="packageId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Pilih paket</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.packageCode} — {p.packageName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Ruang Lingkup</label>
        <input name="scope" placeholder="Mis. Reviu HPS dan proses pemilihan" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Alasan</label>
        <textarea name="reason" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Mengirim..." : "Ajukan Permintaan Reviu"}</Button>
    </form>
  );
}

export function StartReviewForm({ reviewRequestId }: { reviewRequestId: string }) {
  const [state, formAction, pending] = useActionState(startReviewAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="reviewRequestId" value={reviewRequestId} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Memulai..." : "Mulai Reviu"}</Button>
    </form>
  );
}

export function AddFindingForm({ reviewId, picOptions }: { reviewId: string; picOptions: { id: string; fullName: string }[] }) {
  const [state, formAction, pending] = useActionState(addFindingAction, empty);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
      <input type="hidden" name="reviewId" value={reviewId} />
      <p className="text-xs font-semibold text-slate-600">Tambah Catatan/Temuan</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">PIC</label>
          <select name="picUserId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Pilih PIC</option>
            {picOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Batas Waktu</label>
          <input type="date" name="dueDate" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Kategori</label>
        <input name="category" placeholder="Dokumen / Anggaran / Jadwal / Lainnya" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Uraian Temuan</label>
        <textarea name="description" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <Feedback state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Menyimpan..." : "Simpan Temuan"}</Button>
    </form>
  );
}

export function CloseReviewForm({ reviewId }: { reviewId: string }) {
  const [state, formAction, pending] = useActionState(closeReviewAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
        {pending ? "Memproses..." : "Tutup Reviu (Reviu Selesai)"}
      </Button>
    </form>
  );
}

export function SubmitFollowupForm({ findingId }: { findingId: string }) {
  const [state, formAction, pending] = useActionState(submitFollowupAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="findingId" value={findingId} />
      <textarea name="response" required rows={2} placeholder="Tanggapan tindak lanjut" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
      <input name="evidenceUri" placeholder="Bukti (nama berkas/tautan)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="text-xs">{pending ? "Mengirim..." : "Kirim Tindak Lanjut"}</Button>
    </form>
  );
}

export function VerifyFollowupForm({ followupId }: { followupId: string }) {
  const [state, formAction, pending] = useActionState(verifyFollowupAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="followupId" value={followupId} />
      <textarea name="verificationNotes" rows={2} placeholder="Catatan verifikasi (wajib jika Perlu Perbaikan)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
      <Feedback state={state} />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="VERIFIED" disabled={pending} className="bg-emerald-600 text-xs hover:bg-emerald-700">
          Verifikasi Selesai
        </Button>
        <Button type="submit" name="decision" value="REVISION" variant="secondary" disabled={pending} className="text-xs">
          Perlu Perbaikan
        </Button>
      </div>
    </form>
  );
}

export function StartRiskReviewForm({ packageId, reasons }: { packageId: string; reasons: string[] }) {
  const [state, formAction, pending] = useActionState(startRiskBasedReviewAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="packageId" value={packageId} />
      <input type="hidden" name="riskReasons" value={reasons.join("; ")} />
      <select name="riskLevel" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
        <option value="HIGH">Tinggi</option>
        <option value="MEDIUM">Sedang</option>
        <option value="LOW">Rendah</option>
      </select>
      <Button type="submit" disabled={pending} className="ml-2 text-xs">
        {pending ? "Memulai..." : "Mulai Reviu"}
      </Button>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
