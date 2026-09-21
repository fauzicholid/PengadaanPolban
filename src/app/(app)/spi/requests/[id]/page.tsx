import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Table, Th, Td } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { RISK_LEVEL_LABELS } from "@/lib/constants";
import { canAccessPackage } from "@/lib/package-access";
import { StartReviewForm, AddFindingForm, CloseReviewForm } from "../../spi-forms";
import Link from "next/link";

export default async function SpiRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const request = await prisma.spiReviewRequest.findUnique({
    where: { id },
    include: {
      package: { include: { ppk: true, stages: { include: { pic: true } } } },
      requester: true,
      review: {
        include: {
          reviewer: true,
          findings: { include: { pic: true, followups: { include: { submittedBy: true, verifiedBy: true } } } },
        },
      },
    },
  });
  if (!request) notFound();

  // SPI findings are internal oversight content — vendors never see them,
  // regardless of any bid/invitation relationship to the package; other
  // roles need to actually be tied to this specific package.
  if (session.role === "PENYEDIA" || !canAccessPackage(session, request.package)) {
    redirect("/forbidden");
  }

  const picCandidates = Array.from(
    new Map(
      [request.package.ppk, ...request.package.stages.map((s) => s.pic)]
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map((u) => [u.id, u])
    ).values()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.package.packageName}
        description={`${request.requestType === "RISK_BASED" ? "Reviu Berbasis Risiko" : "Permintaan Reviu"} · Diajukan oleh ${request.requester.fullName} pada ${formatDate(request.requestedAt)}`}
        action={
          <Link href={`/packages/${request.packageId}`} className="text-xs font-medium text-blue-700 hover:underline">
            Lihat Paket →
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Nilai Pagu</p>
            <p className="font-medium">{formatRupiah(request.package.budgetCeiling)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Ruang Lingkup</p>
            <p className="font-medium">{request.scope || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Alasan</p>
            <p className="font-medium">{request.reason}</p>
          </div>
        </div>
      </Card>

      {!request.review ? (
        session.role === "SPI" ? (
          <Card className="p-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Terima Penugasan</h3>
            <StartReviewForm reviewRequestId={request.id} />
          </Card>
        ) : (
          <Card className="p-6 text-sm text-slate-400">Menunggu SPI memulai reviu.</Card>
        )
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Reviewer: {request.review.reviewer.fullName}</p>
                <p className="text-xs text-slate-500">Mulai: {formatDateTime(request.review.startedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {request.review.riskLevel ? (
                  <StatusBadge kind="spi" status={request.review.riskLevel === "HIGH" ? "FOLLOW_UP_REQUIRED" : "UNDER_REVIEW"} />
                ) : null}
                <StatusBadge kind="spi" status={request.review.reviewStatus} />
              </div>
            </div>
            {request.review.riskLevel ? (
              <p className="mt-2 text-xs text-slate-500">
                Tingkat Risiko: <strong>{RISK_LEVEL_LABELS[request.review.riskLevel]}</strong>
                {request.review.riskReasons ? ` — ${request.review.riskReasons}` : ""}
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Temuan & Tindak Lanjut" />
            <div className="space-y-4 p-5">
              {session.role === "SPI" && request.review.reviewStatus !== "CLOSED" ? (
                <AddFindingForm reviewId={request.review.id} picOptions={picCandidates} />
              ) : null}

              {request.review.findings.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada temuan.</p>
              ) : (
                <div className="space-y-3">
                  {request.review.findings.map((f) => (
                    <div key={f.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{f.description}</p>
                        <StatusBadge kind="finding" status={f.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        PIC: {f.pic?.fullName ?? "-"} · Batas Waktu: {formatDate(f.dueDate)} · Kategori: {f.category ?? "-"}
                      </p>
                      {f.followups.length > 0 ? (
                        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                          {f.followups.map((fu) => (
                            <p key={fu.id}>
                              {fu.submittedBy.fullName}: {fu.response} — <StatusBadge kind="document" status={fu.verificationStatus === "WAITING_VERIFICATION" ? "UNDER_REVIEW" : fu.verificationStatus === "VERIFIED" ? "APPROVED" : "REVISION"} />
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {session.role === "SPI" && request.review.reviewStatus !== "CLOSED" ? (
                <CloseReviewForm reviewId={request.review.id} />
              ) : null}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
