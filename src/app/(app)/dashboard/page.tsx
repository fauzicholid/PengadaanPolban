import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardHeader, StatCard, LinkButton, Table, Th, Td, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah, formatNumber } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session);
  const maxPipeline = Math.max(1, ...data.pipeline.map((p) => p.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Dasbor Eksekutif — {ROLE_LABELS[session.role]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Anggaran, progres, SLA, risiko, dan drill-down sesuai ruang lingkup
          kewenangan Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Pagu" value={formatRupiah(data.totalPagu)} />
        <StatCard label="Total HPS" value={formatRupiah(data.totalHps)} />
        <StatCard label="Nilai Kontrak" value={formatRupiah(data.totalKontrak)} />
        <StatCard
          label="Realisasi"
          value={formatRupiah(data.totalRealisasi)}
          tone="success"
        />
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
          label="Mendekati Batas Waktu"
          value={formatNumber(data.dueSoonCount)}
          tone={data.dueSoonCount > 0 ? "warning" : "default"}
        />
        <StatCard label="Paket Selesai" value={formatNumber(data.completedCount)} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pipeline RUP → Persiapan → Pemilihan → Kontrak → Pelaksanaan → Selesai"
            subtitle="Jumlah paket per tahap kumulatif"
          />
          <div className="space-y-3 p-5">
            {data.pipeline.map((stage) => (
              <div key={stage.code} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-medium text-slate-600">
                  {stage.label}
                </span>
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
          <CardHeader title="Panel Reviu" subtitle="Menunggu tindakan" />
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Menunggu Persetujuan KPA</span>
              <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                {data.waitingApprovalCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Menunggu Dokumen/BA</span>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                {data.waitingDocumentCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Dalam Reviu SPI</span>
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                {data.spiUnderReview}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Tindak Lanjut SPI Diperlukan</span>
              <Badge className="border-orange-200 bg-orange-50 text-orange-700">
                {data.spiFollowUp}
              </Badge>
            </div>
            <Link
              href="/spi"
              className="block pt-2 text-xs font-medium text-blue-700 hover:underline"
            >
              Lihat Dasbor SPI →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Paket Kritis"
          subtitle="Paket terlambat atau mendekati batas waktu — drill-down ke dokumen sumber"
          action={<LinkButton href="/packages" variant="secondary">Semua Paket</LinkButton>}
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
                <Th>Dokumen</Th>
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
                      <Badge className="border-yellow-200 bg-yellow-50 text-yellow-800">
                        Mendekati Batas
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    {p.missingDocs ? (
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700">Belum Lengkap</Badge>
                    ) : (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Lengkap</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Paket Terbaru" subtitle="Aktivitas pengadaan terkini pada ruang lingkup Anda" />
        {data.recentPackages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada paket.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Kode Paket</Th>
                <Th>Nama Paket</Th>
                <Th>Status</Th>
                <Th>Progres</Th>
                <Th>Pagu</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentPackages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/packages/${p.id}`} className="font-medium text-blue-700 hover:underline">
                      {p.packageCode}
                    </Link>
                  </Td>
                  <Td>{p.packageName}</Td>
                  <Td>
                    <StatusBadge kind="package" status={p.status} />
                  </Td>
                  <Td>{Number(p.progressPercent)}%</Td>
                  <Td>{formatRupiah(p.budgetCeiling)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
