import { getDashboardData } from "@/lib/dashboard";
import type { SessionPayload } from "@/lib/session";
import { Card, CardHeader, StatCard, LinkButton, Table, Th, Td, Badge } from "@/components/ui";
import { formatRupiah, formatNumber } from "@/lib/format";
import Link from "next/link";

export async function KpaDashboard({ session }: { session: SessionPayload }) {
  const data = await getDashboardData(session);
  const maxPipeline = Math.max(1, ...data.pipeline.map((p) => p.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dasbor KPA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Anggaran, progres, paket, dan tindak lanjut SPI dalam ruang lingkup kewenangan Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Pagu" value={formatRupiah(data.totalPagu)} />
        <StatCard label="Total HPS" value={formatRupiah(data.totalHps)} />
        <StatCard label="Nilai Kontrak" value={formatRupiah(data.totalKontrak)} />
        <StatCard label="Realisasi" value={formatRupiah(data.totalRealisasi)} tone="success" />
        <StatCard
          label="Sisa Anggaran"
          value={formatRupiah(data.sisaAnggaran)}
          tone={data.sisaAnggaran < 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Jumlah Paket" value={formatNumber(data.totalPackages)} />
        <StatCard
          label="Paket Terlambat"
          value={formatNumber(data.overdueCount)}
          tone={data.overdueCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Menunggu Reviu"
          value={formatNumber(data.waitingApprovalCount)}
          tone={data.waitingApprovalCount > 0 ? "warning" : "default"}
        />
        <StatCard label="Paket Selesai" value={formatNumber(data.completedCount)} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Funnel RUP → Paket → Kontrak → Selesai"
            subtitle="Jumlah paket per tahap kumulatif"
          />
          <div className="space-y-3 p-5">
            {data.pipeline.map((stage) => (
              <div key={stage.code} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-medium text-slate-600">{stage.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${(stage.count / maxPipeline) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700">
                  {stage.count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Status Tindak Lanjut SPI" subtitle="Menunggu tindakan" />
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Dalam Reviu SPI</span>
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">{data.spiUnderReview}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Perlu Tindak Lanjut</span>
              <Badge className="border-orange-200 bg-orange-50 text-orange-700">{data.spiFollowUp}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Menunggu Dokumen/BA</span>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                {data.waitingDocumentCount}
              </Badge>
            </div>
            <Link href="/spi" className="block pt-2 text-xs font-medium text-blue-700 hover:underline">
              Lihat Dasbor SPI →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Daftar Paket Menunggu Reviu"
          subtitle="Segera lakukan reviu/persetujuan sesuai kewenangan Anda"
          action={<LinkButton href="/packages" variant="secondary">Semua Paket</LinkButton>}
        />
        {data.recentPackages.filter((p) => p.status === "REVIU").length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Tidak ada paket menunggu reviu saat ini.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Kode Paket</Th>
                <Th>Nama Paket</Th>
                <Th>Progres</Th>
                <Th>Pagu</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentPackages
                .filter((p) => p.status === "REVIU")
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/packages/${p.id}?tab=dokumen`} className="font-medium text-blue-700 hover:underline">
                        {p.packageCode}
                      </Link>
                    </Td>
                    <Td>{p.packageName}</Td>
                    <Td>{Number(p.progressPercent)}%</Td>
                    <Td>{formatRupiah(p.budgetCeiling)}</Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Paket Kritis"
          subtitle="Paket terlambat atau mendekati batas waktu"
        />
        {data.criticalPackages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Tidak ada paket kritis pada ruang lingkup ini. 🎉
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Paket</Th>
                <Th>PPK</Th>
                <Th>Nilai</Th>
                <Th>Tahap Berjalan</Th>
                <Th>Keterlambatan</Th>
              </tr>
            </thead>
            <tbody>
              {data.criticalPackages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/packages/${p.id}`} className="font-medium text-blue-700 hover:underline">
                      {p.packageCode}
                    </Link>
                    <p className="text-xs text-slate-500">{p.packageName}</p>
                  </Td>
                  <Td>{p.ppkName}</Td>
                  <Td>{formatRupiah(p.value)}</Td>
                  <Td>{p.currentStage}</Td>
                  <Td>
                    {p.overdue ? (
                      <Badge className="border-red-200 bg-red-50 text-red-700">Terlambat</Badge>
                    ) : (
                      <Badge className="border-yellow-200 bg-yellow-50 text-yellow-800">Mendekati Batas</Badge>
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
