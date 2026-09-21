"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  updatePackageDraftAction,
  uploadStageDocumentAction,
  completeStageAction,
  submitStageForApprovalAction,
  decideStageApprovalAction,
  assignPejabatPengadaanAction,
  acceptPejabatPengadaanAssignmentAction,
  returnPejabatPengadaanAssignmentAction,
  approveStageDocumentAction,
  cancelPackageAction,
  type FormState as PkgFormState,
} from "@/actions/package";
import {
  inviteVendorAction,
  submitBidAction,
  evaluateBidAction,
  setBidWinnerAction,
  type FormState as SelFormState,
} from "@/actions/selection";
import {
  createContractAction,
  addMilestoneAction,
  updateMilestoneProgressAction,
  addAddendumAction,
  type FormState as ContractFormState,
} from "@/actions/contract";
import { generateStageDocumentAction, type DocActionState } from "@/actions/documents";

const empty = {};

function ErrorSuccess({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>;
  if (state.success) return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p>;
  return null;
}

export function ApproveDocumentButton({ documentId }: { documentId: string }) {
  const [state, formAction, pending] = useActionState(approveStageDocumentAction, empty as PkgFormState);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="documentId" value={documentId} />
      <button className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "Memproses..." : "Setujui"}
      </button>
      {state.error ? <p className="mt-1 text-[11px] text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function DraftForm({
  packageId,
  defaults,
  disabled,
}: {
  packageId: string;
  defaults: { kakSummary: string; specification: string; hpsValue: string; contractDraft: string; requirements: string; scheduleNotes: string };
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(updatePackageDraftAction, empty);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="packageId" value={packageId} />
      <Textarea label="KAK / Ringkasan" name="kakSummary" defaultValue={defaults.kakSummary} disabled={disabled} />
      <Textarea label="Spesifikasi" name="specification" defaultValue={defaults.specification} disabled={disabled} />
      <Input label="Nilai HPS (Rp)" name="hpsValue" type="number" defaultValue={defaults.hpsValue} disabled={disabled} />
      <Textarea label="Rancangan Kontrak" name="contractDraft" defaultValue={defaults.contractDraft} disabled={disabled} />
      <Textarea label="Persyaratan Penyedia / KBLI" name="requirements" defaultValue={defaults.requirements} disabled={disabled} />
      <Input label="Catatan Jadwal" name="scheduleNotes" defaultValue={defaults.scheduleNotes} disabled={disabled} />
      <ErrorSuccess state={state} />
      {!disabled ? (
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Draf"}
        </Button>
      ) : null}
    </form>
  );
}

export function UploadDocForm({
  stageId,
  suggestedType,
  typeOptions = [],
}: {
  stageId: string;
  suggestedType?: string;
  typeOptions?: { type: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(uploadStageDocumentAction, empty);
  const listId = `doc-types-${stageId}`;
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="stageId" value={stageId} />
      <div className="w-44">
        <label className="mb-1 block text-xs font-medium text-slate-600">Jenis Dokumen</label>
        <input
          name="documentType"
          list={typeOptions.length > 0 ? listId : undefined}
          defaultValue={suggestedType}
          required
          placeholder={typeOptions.length > 0 ? "Pilih atau ketik jenis dokumen" : undefined}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-600"
        />
        {typeOptions.length > 0 ? (
          <datalist id={listId}>
            {typeOptions.map((opt) => (
              <option key={opt.type} value={opt.type}>
                {opt.label}
              </option>
            ))}
          </datalist>
        ) : null}
      </div>
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Nama Berkas / Tautan</label>
        <input
          name="fileUri"
          required
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-600"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="h-[30px] py-0 text-xs">
        {pending ? "..." : "Unggah"}
      </Button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function GenerateDocumentForm({
  stageId,
  options,
}: {
  stageId: string;
  options: { type: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<DocActionState, FormData>(generateStageDocumentAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="stageId" value={stageId} />
      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-slate-600">Generate Dokumen Sistem</label>
        <select
          name="documentType"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-600"
        >
          {options.map((opt) => (
            <option key={opt.type} value={opt.type}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="h-[30px] py-0 text-xs">
        {pending ? "Membuat..." : "Generate"}
      </Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function CompleteStageForm({ stageId, label }: { stageId: string; label: string }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(completeStageAction, empty);
  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="stageId" value={stageId} />
      <Button type="submit" disabled={pending} className="text-xs">
        {pending ? "Memproses..." : label}
      </Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function SubmitApprovalForm({ stageId }: { stageId: string }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(submitStageForApprovalAction, empty);
  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="stageId" value={stageId} />
      <Button type="submit" disabled={pending} className="text-xs">
        {pending ? "Mengirim..." : "Ajukan Reviu ke SPI"}
      </Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function DecideApprovalForm({ stageId }: { stageId: string }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(decideStageApprovalAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="stageId" value={stageId} />
      <textarea
        name="notes"
        rows={2}
        placeholder="Catatan (wajib untuk Perlu Perbaikan/Ditolak)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
      />
      <ErrorSuccess state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="APPROVED" disabled={pending} className="bg-emerald-600 text-xs hover:bg-emerald-700">
          Setujui
        </Button>
        <Button type="submit" name="decision" value="REVISION" variant="secondary" disabled={pending} className="text-xs">
          Perlu Perbaikan
        </Button>
        <Button type="submit" name="decision" value="REJECTED" variant="danger" disabled={pending} className="text-xs">
          Tolak
        </Button>
      </div>
    </form>
  );
}

export function AssignPejabatForm({ packageId, options }: { packageId: string; options: { id: string; fullName: string }[] }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(assignPejabatPengadaanAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="packageId" value={packageId} />
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Pejabat Pengadaan</label>
        <select name="userId" required className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs">
          <option value="">Pilih</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.fullName}</option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="text-xs">Tugaskan</Button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
      {state.success ? <p className="w-full text-xs text-emerald-600">{state.success}</p> : null}
    </form>
  );
}

export function AcceptAssignmentForm({ stageId }: { stageId: string }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(
    acceptPejabatPengadaanAssignmentAction,
    empty
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="stageId" value={stageId} />
      <Button type="submit" disabled={pending} className="text-xs">
        {pending ? "Memproses..." : "Terima Penugasan"}
      </Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function ReturnAssignmentForm({ stageId }: { stageId: string }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(
    returnPejabatPengadaanAssignmentAction,
    empty
  );
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="stageId" value={stageId} />
      <textarea
        name="reason"
        rows={2}
        required
        placeholder="Alasan pengembalian ke PPK (wajib) — mis. kelengkapan KAK/HPS belum sesuai"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-red-500"
      />
      <Button type="submit" variant="danger" disabled={pending} className="text-xs">
        {pending ? "Memproses..." : "Kembalikan ke PPK"}
      </Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function InviteVendorForm({ packageId, options }: { packageId: string; options: { id: string; companyName: string }[] }) {
  const [state, formAction, pending] = useActionState<SelFormState, FormData>(inviteVendorAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="packageId" value={packageId} />
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Penyedia Terverifikasi</label>
        <select name="vendorId" required className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs">
          <option value="">Pilih penyedia</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.companyName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Batas Waktu</label>
        <input type="date" name="deadlineAt" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="text-xs">Undang</Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function BidForm({ packageId }: { packageId: string }) {
  const [state, formAction, pending] = useActionState<SelFormState, FormData>(submitBidAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="packageId" value={packageId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nilai Penawaran (Rp)</label>
        <input type="number" name="offeredValue" required className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
      </div>
      <Button type="submit" disabled={pending} className="text-xs">Kirim Penawaran</Button>
      <ErrorSuccess state={state} />
    </form>
  );
}

export function EvaluateForm({ bidId }: { bidId: string }) {
  const [state, formAction, pending] = useActionState<SelFormState, FormData>(evaluateBidAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
      <input type="hidden" name="bidId" value={bidId} />
      <select name="stage" required className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
        <option value="ADMINISTRASI">Administrasi</option>
        <option value="TEKNIS">Teknis</option>
        <option value="HARGA">Harga</option>
      </select>
      <select name="result" required className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
        <option value="LULUS">Lulus</option>
        <option value="TIDAK_LULUS">Tidak Lulus</option>
      </select>
      <input name="notes" placeholder="Catatan" className="min-w-[120px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
      <Button type="submit" variant="secondary" disabled={pending} className="text-xs">Simpan</Button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function WinnerForm({ bidId }: { bidId: string }) {
  const [state, formAction, pending] = useActionState<SelFormState, FormData>(setBidWinnerAction, empty);
  return (
    <form action={formAction}>
      <input type="hidden" name="bidId" value={bidId} />
      <Button type="submit" disabled={pending} className="bg-emerald-600 text-xs hover:bg-emerald-700">
        Tetapkan Pemenang
      </Button>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function ContractForm({ packageId }: { packageId: string }) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(createContractAction, empty);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="packageId" value={packageId} />
      <Input label="Nomor Kontrak/SPK" name="contractNumber" required />
      <Input label="Nilai Kontrak (Rp)" name="contractValue" type="number" required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal Mulai" name="startDate" type="date" required />
        <Input label="Tanggal Selesai" name="endDate" type="date" required />
      </div>
      <ErrorSuccess state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Buat Kontrak"}</Button>
    </form>
  );
}

export function MilestoneForm({ contractId }: { contractId: string }) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(addMilestoneAction, empty);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="contractId" value={contractId} />
      <input name="name" required placeholder="Nama milestone" className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
      <input type="date" name="targetDate" required className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
      <Button type="submit" variant="secondary" disabled={pending} className="text-xs">Tambah</Button>
      {state.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function MilestoneProgressForm({ milestoneId, current }: { milestoneId: string; current: number }) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(updateMilestoneProgressAction, empty);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input
        type="number"
        name="progressPercent"
        min={0}
        max={100}
        defaultValue={current}
        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <span className="text-xs text-slate-400">%</span>
      <Button type="submit" variant="ghost" disabled={pending} className="text-xs">Update</Button>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function AddendumForm({ contractId }: { contractId: string }) {
  const [state, formAction, pending] = useActionState<ContractFormState, FormData>(addAddendumAction, empty);
  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
      <input type="hidden" name="contractId" value={contractId} />
      <Input label="Alasan Addendum" name="reason" required />
      <Textarea label="Perubahan" name="changes" required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nilai Baru (Rp, opsional)" name="newValue" type="number" />
        <Input label="Tanggal Selesai Baru (opsional)" name="newEndDate" type="date" />
      </div>
      <ErrorSuccess state={state} />
      <Button type="submit" variant="secondary" disabled={pending} className="text-xs">
        {pending ? "Menyimpan..." : "Simpan Addendum"}
      </Button>
    </form>
  );
}

export function CancelForm({ packageId }: { packageId: string }) {
  const [state, formAction, pending] = useActionState<PkgFormState, FormData>(cancelPackageAction, empty);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="packageId" value={packageId} />
      <textarea
        name="reason"
        rows={2}
        required
        placeholder="Alasan pembatalan (wajib)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-red-500"
      />
      <ErrorSuccess state={state} />
      <Button type="submit" variant="danger" disabled={pending} className="text-xs">
        {pending ? "Memproses..." : "Batalkan Paket"}
      </Button>
    </form>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  disabled,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}
