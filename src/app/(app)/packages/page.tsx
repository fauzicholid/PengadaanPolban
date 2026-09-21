import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, LinkButton, EmptyState, ProgressBar } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah } from "@/lib/format";
import { packageAccessWhereClause } from "@/lib/package-access";
import Link from "next/link";

export default async function PackagesPage() {
  const session = await requireSession();
  const where = packageAccessWhereClause(session);

  const packages = await prisma.procurementPackage.findMany({
    where,
    include: { ppk: true, rup: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Semua Paket"
        description="Kelola paket melalui tahapan terkontrol: Persiapan → Reviu → Pemilihan → Evaluasi → Hasil → Kontrak → Pelaksanaan → BAST."
        action={session.role === "PPK" ? <LinkButton href="/packages/new">+ Buat Paket dari RUP</LinkButton> : undefined}
      />
      <Card>
        {packages.length === 0 ? (
          <EmptyState title="Belum ada paket pada ruang lingkup Anda" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Kode Paket</Th>
                <Th>Nama Paket</Th>
                <Th>PPK</Th>
                <Th>Pagu</Th>
                <Th>Progres</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/packages/${p.id}`} className="font-medium text-blue-700 hover:underline">
                      {p.packageCode}
                    </Link>
                  </Td>
                  <Td>{p.packageName}</Td>
                  <Td>{p.ppk.fullName}</Td>
                  <Td>{formatRupiah(p.budgetCeiling)}</Td>
                  <Td className="w-40">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={Number(p.progressPercent)} />
                      <span className="w-9 shrink-0 text-xs text-slate-500">
                        {Number(p.progressPercent)}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <StatusBadge kind="package" status={p.status} />
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
