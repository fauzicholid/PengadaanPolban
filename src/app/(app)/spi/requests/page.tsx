import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { canAccessPackage } from "@/lib/package-access";
import { CreateReviewRequestForm } from "../spi-forms";
import Link from "next/link";

export default async function SpiRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ packageId?: string }>;
}) {
  const session = await requireSession();
  const { packageId } = await searchParams;

  const allRequests = await prisma.spiReviewRequest.findMany({
    include: { package: { include: { stages: true } }, review: true, requester: true },
    orderBy: { requestedAt: "desc" },
  });
  // Same rule as the detail page: SPI findings are internal, vendors never
  // see them; other roles only see requests tied to a package they're on.
  const requests =
    session.role === "PENYEDIA"
      ? []
      : allRequests.filter((r) => canAccessPackage(session, r.package));

  const canCreate = session.role === "KPA" || session.role === "PPK";
  const packages = canCreate
    ? await prisma.procurementPackage.findMany({
        where: session.role === "PPK" ? { ppkUserId: session.userId } : {},
        select: { id: true, packageCode: true, packageName: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Reviu SPI"
        description="KPA/PPK mengajukan paket/tahapan kepada SPI dengan ruang lingkup, alasan, target waktu, dan dokumen."
      />

      {canCreate ? (
        <Card className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Ajukan Permintaan Baru</h3>
          <CreateReviewRequestForm packages={packages} />
          {packageId ? null : null}
        </Card>
      ) : null}

      <Card>
        {requests.length === 0 ? (
          <EmptyState title="Belum ada permintaan reviu" />
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
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/spi/requests/${r.id}`} className="font-medium text-blue-700 hover:underline">
                      {r.package.packageName}
                    </Link>
                  </Td>
                  <Td>{r.requestType === "RISK_BASED" ? "Berbasis Risiko" : "Permintaan"}</Td>
                  <Td>{r.requester.fullName}</Td>
                  <Td className="text-xs">{formatDate(r.requestedAt)}</Td>
                  <Td>{r.review ? <StatusBadge kind="spi" status={r.review.reviewStatus} /> : <StatusBadge kind="spi" status="NOT_REVIEWED" />}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
