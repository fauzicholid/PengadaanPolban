import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDocumentWithAccess } from "@/lib/document-access";
import {
  signStageDocumentAction,
  signStageDocumentAsVendorAction,
  signStageDocumentAsKpaAction,
} from "@/actions/documents";
import { qrDataUrl, verifyUrl } from "@/lib/qr";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_REQUIRED_SIGNERS, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, doc, allowed, winningBid } = await getDocumentWithAccess(id);

  if (!doc) notFound();
  if (!allowed) redirect("/forbidden");
  if (!doc.isGenerated || !doc.contentHtml) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-slate-500">
        Dokumen ini bukan dokumen hasil generate sistem.
      </div>
    );
  }

  const label = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const requiredRoles = DOCUMENT_REQUIRED_SIGNERS[doc.documentType] ?? [];
  const signedByRole = new Map(doc.signatures.map((s) => [s.signerRole, s]));

  const canSignAsPpk =
    requiredRoles.includes("PPK") &&
    !signedByRole.has("PPK") &&
    (session.role === "ADMIN" || (session.role === "PPK" && doc.stage.package.ppkUserId === session.userId));

  const canSignAsVendor =
    requiredRoles.includes("PENYEDIA") &&
    !signedByRole.has("PENYEDIA") &&
    session.role === "PENYEDIA" &&
    !!winningBid &&
    winningBid.vendorId === session.vendorId;

  const canSignAsKpa =
    requiredRoles.includes("KPA") &&
    !signedByRole.has("KPA") &&
    signedByRole.has("PPK") &&
    (session.role === "KPA" || session.role === "ADMIN");

  const signatureBlocks = await Promise.all(
    requiredRoles.map(async (role) => {
      const sig = signedByRole.get(role);
      const qr = sig ? await qrDataUrl(verifyUrl(sig.verificationCode)) : null;
      return { role, sig, qr };
    })
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <style>{`
        .doc-paper { background: white; }
        .doc-paper .doc-header { text-align: center; margin-bottom: 1.5rem; }
        .doc-paper .doc-kop { font-size: 0.75rem; color: #475569; line-height: 1.4; }
        .doc-paper h1 { font-size: 1.1rem; font-weight: 700; margin-top: 0.5rem; letter-spacing: 0.02em; }
        .doc-paper .doc-number { font-size: 0.8rem; color: #64748b; }
        .doc-paper .doc-body { font-size: 0.9rem; line-height: 1.7; color: #1e293b; }
        .doc-paper table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
        .doc-paper th, .doc-paper td { border: 1px solid #cbd5e1; padding: 0.4rem 0.6rem; text-align: left; }
        .doc-paper th { background: #f1f5f9; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .doc-paper { box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between px-4">
        <Link href={`/packages/${doc.stage.packageId}?tab=dokumen`} className="text-xs font-medium text-blue-700 hover:underline">
          ← Kembali ke Paket
        </Link>
        <PrintButton />
      </div>

      <div className="doc-paper mx-auto max-w-3xl rounded-xl border border-slate-200 p-10 shadow-sm">
        <div dangerouslySetInnerHTML={{ __html: doc.contentHtml }} />

        <div className="mt-10 grid gap-8 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {signatureBlocks.map(({ role, sig, qr }) => (
            <div key={role} className="text-center text-sm">
              <p className="mb-1 text-xs text-slate-500">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</p>
              {sig ? (
                <>
                  {qr ? <img src={qr} alt="QR verifikasi" className="mx-auto h-24 w-24" /> : null}
                  <p className="mt-2 font-semibold text-slate-900">{sig.signerName}</p>
                  <p className="text-xs text-slate-500">Ditandatangani secara elektronik</p>
                  <p className="text-xs text-slate-500">{formatDateTime(sig.signedAt)}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">Kode: {sig.verificationCode}</p>
                </>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                  <span>Menunggu tanda tangan</span>
                  {role === "PPK" && canSignAsPpk ? (
                    <form
                      action={async () => {
                        "use server";
                        await signStageDocumentAction(doc.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="no-print rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                      >
                        Tanda Tangani (PPK)
                      </button>
                    </form>
                  ) : null}
                  {role === "PENYEDIA" && canSignAsVendor ? (
                    <form
                      action={async () => {
                        "use server";
                        await signStageDocumentAsVendorAction(doc.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="no-print rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                      >
                        Tanda Tangani (Penyedia)
                      </button>
                    </form>
                  ) : null}
                  {role === "KPA" && !signedByRole.has("PPK") ? (
                    <span className="text-[10px] text-slate-400">Menunggu tanda tangan PPK terlebih dahulu</span>
                  ) : null}
                  {role === "KPA" && canSignAsKpa ? (
                    <form
                      action={async () => {
                        "use server";
                        await signStageDocumentAsKpaAction(doc.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="no-print rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                      >
                        Tanda Tangani (KPA)
                      </button>
                    </form>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="no-print mt-6 text-center text-[10px] text-slate-400">
          Keabsahan dokumen ini dapat diverifikasi melalui kode/QR pada masing-masing tanda tangan.
          Dokumen {label} — versi {doc.version}.
        </p>
      </div>
    </div>
  );
}
