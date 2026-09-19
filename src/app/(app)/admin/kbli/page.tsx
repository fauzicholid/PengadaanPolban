import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Table, Th, Td, Badge } from "@/components/ui";
import { KbliForm } from "./kbli-form";

export default async function AdminKbliPage() {
  await requireRole(["ADMIN"]);
  const items = await prisma.kbliMaster.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master KBLI"
        description="Master KBLI mendukung versi klasifikasi, status aktif, deskripsi, dan histori perubahan."
      />
      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Tambah KBLI</h3>
        <KbliForm />
      </Card>
      <Card>
        <CardHeader title="Daftar KBLI" />
        <Table>
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Nama</Th>
              <Th>Versi</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((k) => (
              <tr key={k.id}>
                <Td className="font-mono text-xs">{k.code}</Td>
                <Td>{k.title}</Td>
                <Td>{k.version}</Td>
                <Td>
                  <Badge className={k.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-100 text-gray-500"}>
                    {k.active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
