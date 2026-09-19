import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { Card, CardHeader, StatCard, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatNumber } from "@/lib/format";
import { computeTiming, stageBlueprintFor } from "@/lib/workflow";
import Link from "next/link";

export async function StafPpkDashboard({ session }: { session: SessionPayload }) {
  const myStages = await prisma.packageStage.findMany({
    where: { picUserId: session.userId },
    include: {
      package: true,
      documents: true,
    },
    orderBy: { targetAt: "asc" },
  });

  const activeStages = myStages.filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED");
  const draftPackages = new Set(
    myStages.filter((s) => s.package.status === "DRAFT" || s.package.status === "PERSIAPAN").map((s) => s.packageId)
  );

  let missingDocsCount = 0;
  let dueSoonCount = 0;
  const checklist: { packageId: string; packageCode: string; stageName: string; missing: string[] }[] = [];

  for (const stage of activeStages) {
    const timing = computeTiming(stage.targetAt, stage.status);
    if (timing.overdue || timing.dueSoon) dueSoonCount += 1;

    const blueprint = stageBlueprintFor(stage.stageCode);
    if (blueprint) {
      const missing = blueprint.requiredDocuments
        .filter((req) => !stage.documents.some((d) => d.documentType === req.type && (d.status === "APPROVED" || d.status === "FINAL")))
        .map((r) => r.label);
      if (missing.length > 0) {
        missingDocsCount += 1;
        checklist.push({ packageId: stage.packageId, packageCode: stage.package.packageCode, stageName: stage.stageName, missing });
      }
    }
  }

  const mySpiFindings = await prisma.spiFinding.findMany({
    where: { picUserId: session.userId, NOT: { status: "RESOLVED" } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dasbor Staf PPK</h1>
        <p className="mt-1 text-sm text-slate-500">Tugas dari PPK, kelengkapan dokumen, dan tindak lanjut yang ditunjuk kepada Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tugas Aktif" value={formatNumber(activeStages.length)} />
        <StatCard label="Draf" value={formatNumber(draftPackages.size)} />
        <StatCard label="Dokumen Kurang" value={formatNumber(missingDocsCount)} tone={missingDocsCount > 0 ? "warning" : "default"} />
        <StatCard label="Jatuh Tempo" value={formatNumber(dueSoonCount)} tone={dueSoonCount > 0 ? "danger" : "default"} />
      </div>

      <Card>
        <CardHeader title="Daftar Tugas dari PPK" subtitle="Tahapan yang Anda kerjakan" />
        {activeStages.length === 0 ? (
          <EmptyState title="Tidak ada tugas aktif saat ini" />
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {activeStages.map((s) => (
              <Link
                key={s.id}
                href={`/packages/${s.packageId}?tab=dokumen`}
                className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50"
              >
                <span>
                  {s.package.packageCode} — {s.stageName}
                  <span className="ml-2 text-xs text-slate-400">{s.package.packageName}</span>
                </span>
                <StatusBadge kind="stage" status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Checklist Dokumen" subtitle="Unggah draf KAK/HPS dan dokumen wajib lainnya" />
        {checklist.length === 0 ? (
          <EmptyState title="Semua dokumen wajib pada tugas Anda sudah lengkap" />
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {checklist.map((c, i) => (
              <Link key={i} href={`/packages/${c.packageId}?tab=dokumen`} className="block px-5 py-2.5 hover:bg-slate-50">
                <p className="font-medium text-slate-800">{c.packageCode} — {c.stageName}</p>
                <p className="text-xs text-amber-600">Kurang: {c.missing.join(", ")}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Tindak Lanjut SPI" subtitle="Catatan/temuan yang ditunjuk kepada Anda sebagai PIC" />
        {mySpiFindings.length === 0 ? (
          <EmptyState title="Tidak ada tindak lanjut SPI yang perlu Anda tangani" />
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {mySpiFindings.map((f) => (
              <Link key={f.id} href="/spi/followups" className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                <span>{f.description.slice(0, 80)}</span>
                <span className="text-xs text-slate-400">{formatDate(f.dueDate)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
