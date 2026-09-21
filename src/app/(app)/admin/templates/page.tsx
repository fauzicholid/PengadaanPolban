import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Table, Th, Td, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, TEMPLATABLE_DOCUMENT_TYPES } from "@/lib/constants";
import { UploadTemplateForm, DeactivateTemplateButton } from "./template-form";

export default async function AdminTemplatesPage() {
  await requireRole(["ADMIN"]);

  const templates = await prisma.documentTemplate.findMany({
    select: {
      id: true,
      documentType: true,
      name: true,
      fileName: true,
      active: true,
      uploadedAt: true,
      uploadedBy: { select: { fullName: true } },
    },
    orderBy: [{ documentType: "asc" }, { uploadedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Template Dokumen BA/Kontrak"
        description="Master template .docx (tanpa kop surat) yang dipakai sistem untuk mail-merge saat generate Berita Acara dan SPK/Kontrak. Kop surat Polban ditambahkan otomatis oleh sistem pada setiap dokumen yang ditampilkan/dicetak."
      />

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Unggah Template Baru</h3>
        <UploadTemplateForm documentTypes={[...TEMPLATABLE_DOCUMENT_TYPES]} />
      </Card>

      <Card>
        <CardHeader title="Daftar Template" subtitle="Template aktif dipakai untuk generate dokumen berikutnya; jika tidak ada template aktif, sistem memakai format bawaan." />
        {templates.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Belum ada template yang diunggah.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Jenis Dokumen</Th>
                <Th>Nama Template</Th>
                <Th>Berkas</Th>
                <Th>Diunggah</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <Td>{DOCUMENT_TYPE_LABELS[t.documentType] ?? t.documentType}</Td>
                  <Td>{t.name}</Td>
                  <Td className="text-xs text-slate-500">{t.fileName}</Td>
                  <Td className="text-xs">
                    {formatDateTime(t.uploadedAt)} &middot; {t.uploadedBy.fullName}
                  </Td>
                  <Td>
                    <Badge className={t.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-100 text-gray-500"}>
                      {t.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </Td>
                  <Td>{t.active ? <DeactivateTemplateButton id={t.id} /> : null}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
