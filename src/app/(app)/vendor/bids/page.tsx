import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState } from "@/components/ui";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";

export default async function VendorBidsPage() {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) return <EmptyState title="Lengkapi registrasi penyedia terlebih dahulu" />;

  const bids = await prisma.bid.findMany({
    where: { vendorId: session.vendorId },
    include: { package: true },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Penawaran Saya" description="Riwayat dan status penawaran yang telah dikirimkan." />
      <Card>
        {bids.length === 0 ? (
          <EmptyState title="Belum ada penawaran" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Paket</Th>
                <Th>Nilai Penawaran</Th>
                <Th>Dikirim</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <Link href={`/packages/${b.packageId}`} className="font-medium text-blue-700 hover:underline">
                      {b.package.packageName}
                    </Link>
                  </Td>
                  <Td>{formatRupiah(b.offeredValue)}</Td>
                  <Td className="text-xs">{formatDateTime(b.submittedAt)}</Td>
                  <Td>
                    <StatusBadge kind="bid" status={b.status} />
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
