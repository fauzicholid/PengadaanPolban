import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { Card, CardHeader, StatCard, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatRupiah, formatNumber } from "@/lib/format";
import { computeTiming } from "@/lib/workflow";
import Link from "next/link";

export async function PejabatDashboard({ session }: { session: SessionPayload }) {
  const myStages = await prisma.packageStage.findMany({
    where: {
      picUserId: session.userId,
      stageCode: { in: ["PEMILIHAN", "EVALUASI", "NEGOSIASI"] },
    },
    include: { package: { include: { bids: { include: { vendor: true } }, invitations: true } }, documents: true },
    orderBy: { targetAt: "asc" },
  });

  const packageIds = [...new Set(myStages.map((s) => s.packageId))];
  const paketMasuk = packageIds.length;

  const evaluasiStages = myStages.filter((s) => s.stageCode === "EVALUASI" && s.status !== "COMPLETED" && s.status !== "CANCELLED");
  const menungguBa = myStages.filter(
    (s) => !s.documents.some((d) => d.required && (d.status === "APPROVED" || d.status === "FINAL"))
  ).length;

  let overdueCount = 0;
  for (const s of myStages) {
    if (computeTiming(s.targetAt, s.status).overdue) overdueCount += 1;
  }

  const allBids = myStages.flatMap((s) => s.package.bids).filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
  const pendingEvaluation = allBids.filter((b) => !["WINNER", "LOSER", "WITHDRAWN"].includes(b.status));
  const unfinalizedBa = myStages.filter((s) => s.documents.some((d) => d.required && d.status !== "FINAL"));

  const upcomingInvitations = myStages
    .flatMap((s) => s.package.invitations.map((inv) => ({ ...inv, packageCode: s.package.packageCode, packageId: s.packageId })))
    .filter((inv, i, arr) => arr.findIndex((x) => x.id === inv.id) === i)
    .filter((inv) => inv.deadlineAt)
    .sort((a, b) => (a.deadlineAt!.getTime() - b.deadlineAt!.getTime()))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dasbor Pejabat Pengadaan</h1>
        <p className="mt-1 text-sm text-slate-500">Antrean paket, jadwal pemilihan, dan evaluasi yang menjadi tanggung jawab Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Paket Masuk" value={formatNumber(paketMasuk)} />
        <StatCard label="Evaluasi" value={formatNumber(evaluasiStages.length)} />
        <StatCard label="Menunggu BA" value={formatNumber(menungguBa)} tone={menungguBa > 0 ? "warning" : "default"} />
        <StatCard label="Terlambat" value={formatNumber(overdueCount)} tone={overdueCount > 0 ? "danger" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Antrean Paket" subtitle="Paket yang menjadi tugas Anda" />
          {myStages.length === 0 ? (
            <EmptyState title="Belum ada paket yang ditugaskan" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {[...new Map(myStages.map((s) => [s.packageId, s])).values()].map((s) => (
                <Link key={s.packageId} href={`/packages/${s.packageId}?tab=penyedia`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{s.package.packageCode} — {s.package.packageName}</span>
                  <StatusBadge kind="package" status={s.package.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Jadwal Pemilihan" subtitle="Batas waktu penawaran terdekat" />
          {upcomingInvitations.length === 0 ? (
            <EmptyState title="Tidak ada jadwal pemilihan aktif" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {upcomingInvitations.map((inv) => (
                <Link key={inv.id} href={`/packages/${inv.packageId}?tab=penyedia`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{inv.packageCode}</span>
                  <span className="text-xs text-slate-400">{formatDate(inv.deadlineAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Evaluasi Administrasi/Teknis/Harga" subtitle="Penawaran yang belum tuntas dievaluasi" />
          {pendingEvaluation.length === 0 ? (
            <EmptyState title="Tidak ada penawaran yang menunggu evaluasi" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {pendingEvaluation.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-2.5">
                  <span>{b.vendor.companyName} — {formatRupiah(b.offeredValue)}</span>
                  <StatusBadge kind="bid" status={b.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="BA Belum Final" subtitle="Berita acara yang perlu difinalisasi" />
          {unfinalizedBa.length === 0 ? (
            <EmptyState title="Semua BA wajib sudah final" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {unfinalizedBa.map((s) => (
                <Link key={s.id} href={`/packages/${s.packageId}?tab=dokumen`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{s.package.packageCode} — {s.stageName}</span>
                  <StatusBadge kind="stage" status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
