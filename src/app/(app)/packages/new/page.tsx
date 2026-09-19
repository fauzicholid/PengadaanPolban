import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { PackageForm } from "./package-form";

export default async function NewPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ rupId?: string }>;
}) {
  await requireRole(["PPK"]);
  const { rupId } = await searchParams;

  const rups = await prisma.rup.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, externalRupId: true, packageName: true, budgetCeiling: true, fiscalYear: true },
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Buat Paket dari RUP"
        description="Data RUP dibawa otomatis; lengkapi KAK/spesifikasi, HPS, dan dokumen pendukung pada halaman detail paket."
      />
      <Card className="p-6">
        <PackageForm
          rups={rups.map((r) => ({ ...r, budgetCeiling: r.budgetCeiling.toString() }))}
          defaultRupId={rupId}
        />
      </Card>
    </div>
  );
}
