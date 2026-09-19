import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, CardHeader, Table, Th, Td } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { VerifyForm } from "./verify-form";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      kbli: { include: { kbli: true } },
      legalDocuments: { orderBy: { uploadedAt: "desc" } },
      verifications: { orderBy: { decidedAt: "desc" }, include: { verifier: true } },
    },
  });
  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.companyName}
        description={`NIB ${vendor.nib} · ${vendor.companyType ?? "-"}`}
        action={<StatusBadge kind="vendor" status={vendor.verificationStatus} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Data Registrasi</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="NPWP" value={vendor.npwp ?? "-"} />
            <Info label="Direktur/Pimpinan" value={vendor.directorName ?? "-"} />
            <Info label="Email" value={vendor.email ?? "-"} />
            <Info label="Telepon" value={vendor.phone ?? "-"} />
            <Info label="Alamat" value={vendor.address ?? "-"} full />
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Ringkasan</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>KBLI Aktif: <strong>{vendor.kbli.filter((k) => k.active).length}</strong></li>
            <li>Dokumen Legalitas: <strong>{vendor.legalDocuments.length}</strong></li>
            <li>Terdaftar: <strong>{formatDate(vendor.createdAt)}</strong></li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="KBLI" subtitle="Satu penyedia dapat memiliki banyak KBLI" />
        {vendor.kbli.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">Belum ada KBLI.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Versi</Th>
                <Th>Status Izin</Th>
              </tr>
            </thead>
            <tbody>
              {vendor.kbli.map((k) => (
                <tr key={k.id}>
                  <Td className="font-mono text-xs">{k.kbli.code}</Td>
                  <Td>{k.kbli.title}</Td>
                  <Td>{k.kbli.version}</Td>
                  <Td>{k.licenseStatus ?? "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Dokumen Legalitas" subtitle="Nomor, tanggal terbit, masa berlaku, file, status verifikasi" />
        {vendor.legalDocuments.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">Belum ada dokumen.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Jenis</Th>
                <Th>Nomor</Th>
                <Th>Berlaku Hingga</Th>
                <Th>Berkas</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {vendor.legalDocuments.map((d) => (
                <tr key={d.id}>
                  <Td>{d.documentType}</Td>
                  <Td>{d.documentNumber ?? "-"}</Td>
                  <Td>{formatDate(d.expiresAt)}</Td>
                  <Td className="max-w-xs truncate text-xs text-blue-700">{d.fileUri}</Td>
                  <Td>
                    <StatusBadge kind="document" status={d.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {session.role === "ADMIN" ? (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Keputusan Verifikasi</h3>
          <VerifyForm vendorId={vendor.id} />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Riwayat Verifikasi" />
        {vendor.verifications.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">Belum ada riwayat.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {vendor.verifications.map((v) => (
              <div key={v.id} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <StatusBadge kind="vendor" status={v.decision} />
                  <span className="text-xs text-slate-400">{formatDateTime(v.decidedAt)}</span>
                </div>
                <p className="mt-1 text-slate-600">{v.notes ?? "-"}</p>
                <p className="mt-1 text-xs text-slate-400">oleh {v.verifier?.fullName ?? "Sistem"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  );
}
