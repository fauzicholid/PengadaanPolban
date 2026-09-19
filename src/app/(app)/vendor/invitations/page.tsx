import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState } from "@/components/ui";
import { formatDate, formatRupiah } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";

export default async function VendorInvitationsPage() {
  const session = await requireRole(["PENYEDIA"]);
  if (!session.vendorId) {
    return (
      <EmptyState title="Lengkapi registrasi penyedia terlebih dahulu" />
    );
  }

  const invitations = await prisma.procurementInvitation.findMany({
    where: { vendorId: session.vendorId },
    include: { package: { include: { rup: true } } },
    orderBy: { invitedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Undangan Pemilihan Penyedia" description="Undangan yang diterbitkan untuk perusahaan Anda." />
      <Card>
        {invitations.length === 0 ? (
          <EmptyState title="Belum ada undangan" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Paket</Th>
                <Th>Nilai Pagu</Th>
                <Th>Batas Waktu</Th>
                <Th>Status Paket</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <Td>
                    <p className="font-medium text-slate-800">{inv.package.packageName}</p>
                    <p className="text-xs text-slate-500">{inv.package.packageCode}</p>
                  </Td>
                  <Td>{formatRupiah(inv.package.budgetCeiling)}</Td>
                  <Td className="text-xs">{formatDate(inv.deadlineAt)}</Td>
                  <Td>
                    <StatusBadge kind="package" status={inv.package.status} />
                  </Td>
                  <Td>
                    <Link href={`/packages/${inv.packageId}?tab=penyedia`} className="text-xs font-medium text-blue-700 hover:underline">
                      Beri Penawaran →
                    </Link>
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
