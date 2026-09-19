import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export default async function VendorsPage() {
  await requireRole(["ADMIN", "PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "KPA", "SPI"]);

  const vendors = await prisma.vendor.findMany({
    include: { kbli: true, legalDocuments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Direktori & Verifikasi Penyedia"
        description="Data penyedia diverifikasi sebelum digunakan dalam proses pengadaan (NIB, NPWP, KBLI, legalitas)."
      />
      <Card>
        {vendors.length === 0 ? (
          <EmptyState title="Belum ada penyedia terdaftar" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Badan Usaha</Th>
                <Th>NIB</Th>
                <Th>KBLI</Th>
                <Th>Dokumen</Th>
                <Th>Status</Th>
                <Th>Terdaftar</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/vendors/${v.id}`} className="font-medium text-blue-700 hover:underline">
                      {v.companyName}
                    </Link>
                    <p className="text-xs text-slate-500">{v.companyType ?? "-"}</p>
                  </Td>
                  <Td className="font-mono text-xs">{v.nib}</Td>
                  <Td>{v.kbli.length}</Td>
                  <Td>{v.legalDocuments.length}</Td>
                  <Td>
                    <StatusBadge kind="vendor" status={v.verificationStatus} />
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(v.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
