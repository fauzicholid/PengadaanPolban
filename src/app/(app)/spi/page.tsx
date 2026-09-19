import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatCard, Table, Th, Td, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah, formatDate } from "@/lib/format";
import Link from "next/link";

export default async function SpiDashboardPage() {
  await requireRole(["SPI", "ADMIN"]);

  const requests = await prisma.spiReviewRequest.findMany({
    include: { package: true, review: { include: { findings: true } }, requester: true },
    orderBy: { requestedAt: "desc" },
  });

  const reviews = requests.map((r) => r.review).filter(Boolean) as NonNullable<
    (typeof requests)[number]["review"]
  >[];

  const inScope = requests.length;
  const notReviewed = reviews.filter((r) => r.reviewStatus === "NOT_REVIEWED").length;
  const underReview = reviews.filter((r) => r.reviewStatus === "UNDER_REVIEW").length;
  const clarification = reviews.filter((r) => r.reviewStatus === "CLARIFICATION").length;
  const followUp = reviews.filter((r) =>
    ["FOLLOW_UP_REQUIRED", "FOLLOW_UP_PROCESS", "FOLLOW_UP_VERIFICATION"].includes(r.reviewStatus)
  ).length;
  const closed = reviews.filter((r) => r.reviewStatus === "CLOSED").length;

  const allFindings = reviews.flatMap((r) => r.findings);
  const overdueFindings = allFindings.filter(
    (f) => f.status !== "RESOLVED" && f.dueDate && f.dueDate < new Date()
  ).length;
  const resolvedFindings = allFindings.filter((f) => f.status === "RESOLVED").length;
  const followupCompletion = allFindings.length
    ? Math.round((resolvedFindings / allFindings.length) * 100)
    : 0;

  const reviewedValue = requests.reduce((sum, r) => sum + Number(r.package.budgetCeiling), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dasbor SPI"
        description="Reviu/pengawasan internal berbasis penugasan dan risiko, tanpa mengambil alih transaksi operasional."
        action={<LinkButton href="/spi/risk" variant="secondary">Antrean Risiko</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Paket Dalam Ruang Lingkup" value={String(inScope)} />
        <StatCard label="Belum/Sedang Direviu" value={String(notReviewed + underReview)} />
        <StatCard label="Memerlukan Klarifikasi" value={String(clarification)} tone={clarification > 0 ? "warning" : "default"} />
        <StatCard label="Perlu Tindak Lanjut" value={String(followUp)} tone={followUp > 0 ? "warning" : "default"} />
        <StatCard label="Tindak Lanjut Terlambat" value={String(overdueFindings)} tone={overdueFindings > 0 ? "danger" : "default"} />
        <StatCard label="Reviu Selesai" value={String(closed)} tone="success" />
        <StatCard label="Nilai Paket Direviu" value={formatRupiah(reviewedValue)} />
        <StatCard label="Penyelesaian Tindak Lanjut" value={`${followupCompletion}%`} tone="success" />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Permintaan & Reviu</h3>
          <LinkButton href="/spi/requests" variant="secondary">Semua Permintaan</LinkButton>
        </div>
        {requests.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada permintaan reviu.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Paket</Th>
                <Th>Jenis</Th>
                <Th>Diajukan Oleh</Th>
                <Th>Tanggal</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 10).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/spi/requests/${r.id}`} className="font-medium text-blue-700 hover:underline">
                      {r.package.packageName}
                    </Link>
                  </Td>
                  <Td>{r.requestType === "RISK_BASED" ? "Berbasis Risiko" : "Permintaan"}</Td>
                  <Td>{r.requester.fullName}</Td>
                  <Td className="text-xs">{formatDate(r.requestedAt)}</Td>
                  <Td>
                    {r.review ? <StatusBadge kind="spi" status={r.review.reviewStatus} /> : <StatusBadge kind="spi" status="NOT_REVIEWED" />}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
