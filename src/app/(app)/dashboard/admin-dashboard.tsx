import { prisma } from "@/lib/prisma";
import { Card, CardHeader, StatCard, LinkButton } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import Link from "next/link";

export async function AdminDashboard() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    activeUsers,
    vendorCount,
    recentAuditLogs,
    recentIntegrationLogs,
    failedLogins,
    expiringDocs,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.vendor.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true },
    }),
    prisma.integrationLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({
      where: { action: "LOGIN_FAILED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true },
    }),
    prisma.vendorLegalDocument.findMany({
      where: { expiresAt: { gte: now, lte: in30Days } },
      include: { vendor: true },
      orderBy: { expiresAt: "asc" },
      take: 6,
    }),
  ]);

  const lastIntegration = recentIntegrationLogs[0];
  const integrationStatus = lastIntegration
    ? lastIntegration.status === "SUCCESS"
      ? "Normal"
      : "Bermasalah"
    : "Belum Ada Data";

  const warningCount = expiringDocs.length + failedLogins.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dasbor Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Konfigurasi sistem, pengguna, integrasi, dan hal yang memerlukan perhatian.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pengguna Aktif" value={formatNumber(activeUsers)} />
        <StatCard label="Penyedia" value={formatNumber(vendorCount)} />
        <StatCard
          label="Integrasi"
          value={integrationStatus}
          tone={integrationStatus === "Normal" ? "success" : integrationStatus === "Bermasalah" ? "danger" : "default"}
        />
        <StatCard
          label="Peringatan Sistem"
          value={formatNumber(warningCount)}
          tone={warningCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Aktivitas Terbaru"
            subtitle="Jejak audit lintas sistem"
            action={<LinkButton href="/audit-logs" variant="secondary">Semua Log</LinkButton>}
          />
          {recentAuditLogs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentAuditLogs.map((log) => (
                <div key={log.id.toString()} className="flex items-center justify-between px-5 py-2.5">
                  <span>
                    <strong>{log.action}</strong> · {log.entityType} oleh {log.user?.fullName ?? "Sistem"}
                  </span>
                  <span className="text-slate-400">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Status Integrasi SiRUP/OSS" subtitle="Log integrasi terkini" />
          {recentIntegrationLogs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada log integrasi.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentIntegrationLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-2.5">
                  <span>
                    <strong>{log.service}</strong> · {log.direction} — {log.message ?? "-"}
                  </span>
                  <span className={log.status === "SUCCESS" ? "text-emerald-600" : "text-red-600"}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pengguna Gagal Login" subtitle="6 percobaan terakhir" />
          {failedLogins.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada percobaan gagal.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {failedLogins.map((log) => (
                <div key={log.id.toString()} className="flex items-center justify-between px-5 py-2.5">
                  <span>{log.user?.email ?? "-"}</span>
                  <span className="text-slate-400">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Dokumen Perlu Perhatian"
            subtitle="Dokumen legalitas penyedia mendekati kedaluwarsa (30 hari)"
          />
          {expiringDocs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada dokumen yang mendekati kedaluwarsa.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {expiringDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/vendors/${doc.vendorId}`}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50"
                >
                  <span>
                    {doc.vendor.companyName} — {doc.documentType}
                  </span>
                  <span className="text-amber-600">{formatDateTime(doc.expiresAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
