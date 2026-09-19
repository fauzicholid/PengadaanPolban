import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const signature = await prisma.documentSignature.findUnique({
    where: { verificationCode: code },
    include: {
      document: {
        include: {
          stage: { include: { package: true } },
        },
      },
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {signature ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Dokumen Sah</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tanda tangan elektronik ini tercatat dan sah pada Sistem Informasi Pengadaan Barang/Jasa Polban.
            </p>
            <dl className="mt-6 space-y-3 text-left text-sm">
              <Row label="Jenis Dokumen" value={DOCUMENT_TYPE_LABELS[signature.document.documentType] ?? signature.document.documentType} />
              <Row label="Paket" value={`${signature.document.stage.package.packageCode} — ${signature.document.stage.package.packageName}`} />
              <Row label="Ditandatangani Oleh" value={signature.signerName} />
              <Row label="Peran" value={ROLE_LABELS[signature.signerRole as keyof typeof ROLE_LABELS] ?? signature.signerRole} />
              <Row label="Waktu" value={formatDateTime(signature.signedAt)} />
              <Row label="Kode Verifikasi" value={signature.verificationCode} mono />
            </dl>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Kode Tidak Ditemukan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kode verifikasi ini tidak terdaftar. Pastikan Anda memindai QR asli dari dokumen resmi.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
