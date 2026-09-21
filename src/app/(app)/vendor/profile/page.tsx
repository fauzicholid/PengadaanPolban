import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Table, Th, Td } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import {
  RegisterVendorForm,
  ProfileForm,
  KbliForm,
  RemoveKbliButton,
  DocumentForm,
  SubmitVerificationButton,
} from "./forms";

export default async function VendorProfilePage() {
  const session = await requireRole(["PENYEDIA"]);

  if (!session.vendorId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Registrasi Penyedia"
          description="Lengkapi nama dan bentuk badan usaha, NIB, NPWP, email, telepon, alamat, dan pimpinan/direktur."
        />
        <Card className="p-6">
          <RegisterVendorForm />
        </Card>
      </div>
    );
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.vendorId },
    include: { kbli: { include: { kbli: true } }, legalDocuments: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!vendor) return null;

  const kbliOptions = await prisma.kbliMaster.findMany({
    where: { active: true, NOT: { id: { in: vendor.kbli.map((k) => k.kbliId) } } },
    orderBy: { code: "asc" },
  });

  const canSubmit = vendor.verificationStatus === "DRAFT" || vendor.verificationStatus === "REVISION";

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.companyName}
        description="Status registrasi dan verifikasi penyedia."
        action={<StatusBadge kind="vendor" status={vendor.verificationStatus} />}
      />

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Profil Perusahaan</h3>
        <ProfileForm
          vendor={{
            companyName: vendor.companyName,
            companyType: vendor.companyType,
            npwp: vendor.npwp,
            directorName: vendor.directorName,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address,
          }}
        />
      </Card>

      <Card>
        <CardHeader title="KBLI" subtitle="Satu penyedia dapat memiliki banyak KBLI" />
        <div className="space-y-4 p-5">
          <KbliForm options={kbliOptions} />
          {vendor.kbli.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Kode</Th>
                  <Th>Nama</Th>
                  <Th>Status Izin</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {vendor.kbli.map((k) => (
                  <tr key={k.id}>
                    <Td className="font-mono text-xs">{k.kbli.code}</Td>
                    <Td>{k.kbli.title}</Td>
                    <Td>{k.licenseStatus ?? "-"}</Td>
                    <Td>
                      <RemoveKbliButton vendorKbliId={k.id} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Dokumen Legalitas" subtitle="Nomor, tanggal terbit, masa berlaku, file, status verifikasi" />
        <div className="space-y-4 p-5">
          <DocumentForm />
          {vendor.legalDocuments.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Jenis</Th>
                  <Th>Nomor</Th>
                  <Th>Berlaku Hingga</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {vendor.legalDocuments.map((d) => (
                  <tr key={d.id}>
                    <Td>{d.documentType}</Td>
                    <Td>{d.documentNumber ?? "-"}</Td>
                    <Td>{formatDate(d.expiresAt)}</Td>
                    <Td>
                      <StatusBadge kind="document" status={d.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </div>
      </Card>

      {canSubmit ? (
        <Card className="p-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Ajukan Verifikasi</h3>
          <p className="mb-3 text-xs text-slate-500">
            Pastikan NPWP, minimal satu KBLI, dan minimal satu dokumen legalitas sudah lengkap.
          </p>
          <SubmitVerificationButton />
        </Card>
      ) : null}
    </div>
  );
}
