import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { Card, CardHeader, StatCard, LinkButton, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { VENDOR_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatRupiah } from "@/lib/format";
import Link from "next/link";

export async function VendorDashboard({ session }: { session: SessionPayload }) {
  if (!session.vendorId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dasbor Penyedia</h1>
          <p className="mt-1 text-sm text-slate-500">Lengkapi registrasi perusahaan Anda untuk mulai menggunakan sistem.</p>
        </div>
        <Card className="p-6">
          <EmptyState
            title="Registrasi belum lengkap"
            description="Lengkapi profil perusahaan pada halaman Profil Penyedia untuk dapat menerima undangan dan mengirim penawaran."
          />
          <div className="px-5 pb-5">
            <LinkButton href="/vendor/profile">Lengkapi Profil</LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [vendor, kbliCount, invitations, activeBids, expiringDocs, recentInvitations] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: session.vendorId } }),
    prisma.vendorKbli.count({ where: { vendorId: session.vendorId } }),
    prisma.procurementInvitation.count({ where: { vendorId: session.vendorId } }),
    prisma.bid.count({
      where: { vendorId: session.vendorId, status: { notIn: ["WINNER", "LOSER", "WITHDRAWN"] } },
    }),
    prisma.vendorLegalDocument.findMany({
      where: { vendorId: session.vendorId, expiresAt: { gte: now, lte: in30Days } },
      orderBy: { expiresAt: "asc" },
      take: 5,
    }),
    prisma.procurementInvitation.findMany({
      where: { vendorId: session.vendorId },
      include: { package: true },
      orderBy: { invitedAt: "desc" },
      take: 5,
    }),
  ]);

  if (!vendor) return null;

  const upcomingDeadlines = recentInvitations
    .filter((inv) => inv.deadlineAt && inv.deadlineAt >= now)
    .sort((a, b) => a.deadlineAt!.getTime() - b.deadlineAt!.getTime())
    .slice(0, 5);

  const recentBids = await prisma.bid.findMany({
    where: { vendorId: session.vendorId },
    include: { package: true },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  let profileScore = 0;
  if (vendor.npwp) profileScore += 25;
  if (kbliCount > 0) profileScore += 25;
  if (vendor.address) profileScore += 25;
  if (vendor.verificationStatus === "VERIFIED") profileScore += 25;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dasbor Penyedia</h1>
        <p className="mt-1 text-sm text-slate-500">{vendor.companyName} — status registrasi, undangan, dan penawaran Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Status Verifikasi"
          value={VENDOR_STATUS_LABELS[vendor.verificationStatus] ?? vendor.verificationStatus}
          tone={vendor.verificationStatus === "VERIFIED" ? "success" : "default"}
        />
        <StatCard label="KBLI Aktif" value={String(kbliCount)} />
        <StatCard label="Undangan" value={String(invitations)} />
        <StatCard label="Penawaran Aktif" value={String(activeBids)} tone={activeBids > 0 ? "warning" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Kelengkapan Profil" subtitle="Semakin lengkap, semakin besar peluang diundang" />
          <div className="space-y-3 p-5">
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${profileScore}%` }} />
            </div>
            <p className="text-xs text-slate-500">{profileScore}% lengkap</p>
            <LinkButton href="/vendor/profile" variant="secondary">Lengkapi Profil</LinkButton>
          </div>
        </Card>

        <Card>
          <CardHeader title="Dokumen Akan Kedaluwarsa" subtitle="Dalam 30 hari ke depan" />
          {expiringDocs.length === 0 ? (
            <EmptyState title="Tidak ada dokumen yang akan kedaluwarsa" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {expiringDocs.map((d) => (
                <Link key={d.id} href="/vendor/profile" className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{d.documentType}</span>
                  <span className="text-xs text-amber-600">{formatDate(d.expiresAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Undangan Terbaru" subtitle="Undangan pemilihan penyedia" action={<LinkButton href="/vendor/invitations" variant="secondary">Semua Undangan</LinkButton>} />
          {recentInvitations.length === 0 ? (
            <EmptyState title="Belum ada undangan" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {recentInvitations.map((inv) => (
                <Link key={inv.id} href={`/packages/${inv.packageId}?tab=penyedia`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{inv.package.packageCode} — {inv.package.packageName}</span>
                  <StatusBadge kind="package" status={inv.package.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Deadline Penawaran" subtitle="Batas waktu terdekat" />
          {upcomingDeadlines.length === 0 ? (
            <EmptyState title="Tidak ada deadline aktif" />
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {upcomingDeadlines.map((inv) => (
                <Link key={inv.id} href={`/packages/${inv.packageId}?tab=penyedia`} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50">
                  <span>{inv.package.packageCode}</span>
                  <span className="text-xs text-slate-400">{formatDate(inv.deadlineAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Status Penawaran" subtitle="Riwayat penawaran terbaru" action={<LinkButton href="/vendor/bids" variant="secondary">Semua Penawaran</LinkButton>} />
        {recentBids.length === 0 ? (
          <EmptyState title="Belum ada penawaran" />
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {recentBids.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-2.5">
                <span>{b.package.packageCode} — {formatRupiah(b.offeredValue)}</span>
                <StatusBadge kind="bid" status={b.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
