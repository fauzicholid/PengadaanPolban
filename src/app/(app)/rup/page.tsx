import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, Badge, LinkButton, EmptyState } from "@/components/ui";
import { formatRupiah, formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function RupPage() {
  const session = await requireSession();
  const canImport = session.role === "ADMIN" || session.role === "PPK";

  const rups = await prisma.rup.findMany({
    include: { workUnit: true, packages: { select: { id: true } } },
    orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Rencana Umum Pengadaan (RUP)"
        description="Referensi utama pembentukan paket. Sinkronisasi/impor SiRUP masuk staging sebelum dipublikasikan ke modul paket."
        action={
          canImport ? (
            <LinkButton href="/rup/new">+ Impor RUP</LinkButton>
          ) : undefined
        }
      />

      <Card>
        {rups.length === 0 ? (
          <EmptyState
            title="Belum ada data RUP"
            description="Impor RUP dari SiRUP (API resmi bila tersedia) atau input manual sebagai fallback."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>RUP ID</Th>
                <Th>Tahun</Th>
                <Th>Nama Paket</Th>
                <Th>Unit Kerja</Th>
                <Th>Pagu</Th>
                <Th>Sumber</Th>
                <Th>Sinkronisasi</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rups.map((rup) => (
                <tr key={rup.id} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs">{rup.externalRupId}</Td>
                  <Td>{rup.fiscalYear}</Td>
                  <Td>
                    <p className="font-medium text-slate-800">{rup.packageName}</p>
                    <p className="text-xs text-slate-500">{rup.procurementMethod ?? "-"}</p>
                  </Td>
                  <Td>{rup.workUnit.name}</Td>
                  <Td>{formatRupiah(rup.budgetCeiling)}</Td>
                  <Td>
                    <Badge
                      className={
                        rup.source === "API_SIRUP"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }
                    >
                      {rup.source === "API_SIRUP" ? "API SiRUP" : "Impor Manual"}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDateTime(rup.syncAt)}</Td>
                  <Td>
                    {session.role === "PPK" ? (
                      <Link
                        href={`/packages/new?rupId=${rup.id}`}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        {rup.packages.length > 0 ? "+ Paket Baru" : "Buat Paket"}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {rup.packages.length} paket
                      </span>
                    )}
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
