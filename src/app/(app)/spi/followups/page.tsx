import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { SubmitFollowupForm, VerifyFollowupForm } from "../spi-forms";

export default async function SpiFollowupsPage() {
  const session = await requireSession();

  if (session.role === "SPI") {
    const followups = await prisma.spiFollowup.findMany({
      where: { verificationStatus: "WAITING_VERIFICATION" },
      include: {
        finding: { include: { review: { include: { request: { include: { package: true } } } } } },
        submittedBy: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return (
      <div>
        <PageHeader title="Verifikasi Tindak Lanjut" description="SPI memverifikasi bukti tindak lanjut yang diajukan PIC." />
        {followups.length === 0 ? (
          <Card><EmptyState title="Tidak ada tindak lanjut menunggu verifikasi" /></Card>
        ) : (
          <div className="space-y-4">
            {followups.map((fu) => (
              <Card key={fu.id} className="p-5">
                <p className="text-sm font-medium text-slate-800">
                  {fu.finding.review.request.package.packageName}
                </p>
                <p className="mt-1 text-xs text-slate-500">{fu.finding.description}</p>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <p><strong>{fu.submittedBy.fullName}</strong> — {formatDateTime(fu.submittedAt)}</p>
                  <p className="mt-1">{fu.response}</p>
                  {fu.evidenceUri ? <p className="mt-1 text-blue-700">Bukti: {fu.evidenceUri}</p> : null}
                </div>
                <div className="mt-3">
                  <VerifyFollowupForm followupId={fu.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const findings = await prisma.spiFinding.findMany({
    where: { picUserId: session.userId, NOT: { status: "RESOLVED" } },
    include: { review: { include: { request: { include: { package: true } } } }, followups: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div>
      <PageHeader title="Tindak Lanjut Saya" description="Catatan/temuan SPI yang memerlukan tindak lanjut Anda sebagai PIC." />
      {findings.length === 0 ? (
        <Card><EmptyState title="Tidak ada tindak lanjut yang perlu Anda tangani" /></Card>
      ) : (
        <div className="space-y-4">
          {findings.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {f.review.request.package.packageName}
                </p>
                <StatusBadge kind="finding" status={f.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">Batas waktu: {formatDate(f.dueDate)}</p>
              <p className="mt-2 text-sm text-slate-700">{f.description}</p>
              {f.status === "FOLLOW_UP_REQUIRED" ? (
                <div className="mt-3">
                  <SubmitFollowupForm findingId={f.id} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">Menunggu verifikasi SPI.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
