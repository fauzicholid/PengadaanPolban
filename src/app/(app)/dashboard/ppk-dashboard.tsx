import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { Card, CardHeader, StatCard, LinkButton, Table, Th, Td, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatNumber } from "@/lib/format";
import { computeTiming } from "@/lib/workflow";
import Link from "next/link";

export async function PpkDashboard({ session }: { session: SessionPayload }) {
  const [rupCount, myPackages] = await Promise.all([
    prisma.rup.count(),
    prisma.procurementPackage.findMany({
      where: { ppkUserId: session.userId },
      include: {
        stages: true,
        contract: { include: { milestones: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const draftCount = myPackages.filter((p) => p.status === "DRAFT").length;
  const runningCount = myPackages.filter(
    (p) => !["DRAFT", "SELESAI", "DIBATALKAN"].includes(p.status)
  ).length;

  let overdueCount = 0;
  const todayTasks: { packageId: string; packageCode: string; stageName: string; targetAt: Date | null }[] = [];
  const needsRevision: { packageId: string; packageCode: string; stageName: string }[] = [];
  const missingDocs: { packageId: string; packageCode: string; stageName: string }[] = [];
  const milestoneAlerts: { packageId: string; packageCode: string; name: string; targetDate: Date }[] = [];

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  for (const p of myPackages) {
    let hasOverdue = false;
    for (const stage of p.stages) {
      const timing = computeTiming(stage.targetAt, stage.status);
      if (timing.overdue) hasOverdue = true;
      if ((timing.overdue || timing.dueSoon) && stage.status !== "COMPLETED" && stage.status !== "CANCELLED") {
        todayTasks.push({ packageId: p.id, packageCode: p.packageCode, stageName: stage.stageName, targetAt: stage.targetAt });
      }
      if (stage.status === "REVISION") {
        needsRevision.push({ packageId: p.id, packageCode: p.packageCode, stageName: stage.stageName });
      }
      if (stage.status === "WAITING_DOCUMENT") {
        missingDocs.push({ packageId: p.id, packageCode: p.packageCode, stageName: stage.stageName });
      }
    }
    if (hasOverdue) overdueCount += 1;

    if (p.contract) {
      for (const m of p.contract.milestones) {
        if (Number(m.progressPercent) === 100) continue;
        if (m.targetDate <= in3Days) {
          milestoneAlerts.push({ packageId: p.id, packageCode: p.packageCode, name: m.name, targetDate: m.targetDate });
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dasbor PPK</h1>
          <p className="mt-1 text-sm text-slate-500">Paket, dokumen, dan milestone kontrak yang menjadi tanggung jawab Anda.</p>
        </div>
        <LinkButton href="/packages/new">+ Buat Paket dari RUP</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="RUP Tersedia" value={formatNumber(rupCount)} />
        <StatCard label="Draf" value={formatNumber(draftCount)} />
        <StatCard label="Berjalan" value={formatNumber(runningCount)} />
        <StatCard label="Terlambat" value={formatNumber(overdueCount)} tone={overdueCount > 0 ? "danger" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pekerjaan Hari Ini" subtitle="Tahapan terlambat atau mendekati batas waktu" />
          {todayTasks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada tahapan yang perlu segera ditindaklanjuti.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {todayTasks.slice(0, 8).map((t, i) => (
                <Link key={i} href={`/packages/${t.packageId}?tab=dokumen`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{t.packageCode} — {t.stageName}</span>
                  <span className="text-xs text-slate-400">{formatDate(t.targetAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Paket Perlu Perbaikan" subtitle="Dikembalikan oleh reviewer" />
          {needsRevision.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada paket yang perlu diperbaiki.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {needsRevision.map((t, i) => (
                <Link key={i} href={`/packages/${t.packageId}?tab=dokumen`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{t.packageCode} — {t.stageName}</span>
                  <StatusBadge kind="stage" status="REVISION" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dokumen Belum Lengkap" subtitle="Menunggu dokumen/BA wajib" />
          {missingDocs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Semua dokumen wajib lengkap.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {missingDocs.map((t, i) => (
                <Link key={i} href={`/packages/${t.packageId}?tab=dokumen`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{t.packageCode} — {t.stageName}</span>
                  <StatusBadge kind="stage" status="WAITING_DOCUMENT" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Milestone Kontrak" subtitle="Mendekati/terlewat target (≤3 hari)" />
          {milestoneAlerts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada milestone yang mendesak.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {milestoneAlerts.map((t, i) => (
                <Link key={i} href={`/packages/${t.packageId}?tab=kontrak`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{t.packageCode} — {t.name}</span>
                  <span className="text-xs text-amber-600">{formatDate(t.targetDate)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Paket Saya" action={<LinkButton href="/packages" variant="secondary">Semua Paket</LinkButton>} />
        {myPackages.length === 0 ? (
          <EmptyState title="Belum ada paket" description="Buat paket baru dari RUP untuk memulai." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Kode Paket</Th>
                <Th>Nama Paket</Th>
                <Th>Status</Th>
                <Th>Progres</Th>
              </tr>
            </thead>
            <tbody>
              {myPackages.slice(0, 8).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/packages/${p.id}`} className="font-medium text-blue-700 hover:underline">
                      {p.packageCode}
                    </Link>
                  </Td>
                  <Td>{p.packageName}</Td>
                  <Td><StatusBadge kind="package" status={p.status} /></Td>
                  <Td>{Number(p.progressPercent)}%</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
