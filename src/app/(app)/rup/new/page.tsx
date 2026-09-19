import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { RupForm } from "./rup-form";

export default async function NewRupPage() {
  await requireRole(["ADMIN", "PPK"]);
  const workUnits = await prisma.workUnit.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Impor RUP"
        description="Prioritas: API/layanan resmi SiRUP bila tersedia. Fallback: impor manual/CSV dengan mapping dan validasi. Data masuk staging sebelum dipublikasikan ke modul paket."
      />
      <Card className="p-6">
        <RupForm workUnits={workUnits} />
      </Card>
    </div>
  );
}
