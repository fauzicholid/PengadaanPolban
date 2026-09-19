import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default async function AuditLogsPage() {
  await requireRole(["ADMIN", "SPI"]);

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Jejak Audit"
        description="Jejak audit yang dapat ditelusuri dari level instansi sampai dokumen. Tidak dapat dihapus pengguna biasa."
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Waktu</Th>
              <Th>Pengguna</Th>
              <Th>Entitas</Th>
              <Th>Aksi</Th>
              <Th>ID Entitas</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id.toString()}>
                <Td className="text-xs">{formatDateTime(log.createdAt)}</Td>
                <Td className="text-xs">{log.user?.fullName ?? "Sistem"}</Td>
                <Td className="text-xs">{log.entityType}</Td>
                <Td className="text-xs font-medium">{log.action}</Td>
                <Td className="max-w-[160px] truncate font-mono text-[10px] text-slate-400">
                  {log.entityId ?? "-"}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
