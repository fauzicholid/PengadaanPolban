import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader } from "@/components/ui";
import { RupForm, ImportRupCsvForm } from "./rup-form";

export default async function NewRupPage() {
  await requireRole(["ADMIN", "PPK"]);
  const workUnits = await prisma.workUnit.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Impor RUP"
        description="Prioritas: API/layanan resmi SiRUP bila tersedia. Fallback: impor manual/CSV dengan mapping dan validasi. Data masuk staging sebelum dipublikasikan ke modul paket."
      />

      <Card>
        <CardHeader title="Impor Massal (CSV)" subtitle="Unggah beberapa data RUP sekaligus dari berkas CSV." />
        <div className="p-6">
          <ImportRupCsvForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Input Manual" subtitle="Tambahkan satu data RUP secara langsung." />
        <div className="p-6">
          <RupForm workUnits={workUnits} />
        </div>
      </Card>
    </div>
  );
}
