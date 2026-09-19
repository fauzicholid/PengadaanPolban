import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, Table, Th, Td, Badge } from "@/components/ui";
import { ROLE_LABELS, ALL_ROLES } from "@/lib/constants";
import { CreateUserForm, ToggleStatusButton } from "./user-forms";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const [users, workUnits] = await Promise.all([
    prisma.user.findMany({
      include: { appointments: { where: { active: true }, include: { role: true, workUnit: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workUnit.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pengguna & Penugasan" description="Kelola pengguna, peran, unit kerja, dan periode penugasan." />

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Tambah Pengguna</h3>
        <CreateUserForm roles={ALL_ROLES.filter((r) => r !== "PENYEDIA")} workUnits={workUnits} />
      </Card>

      <Card>
        <CardHeader title="Daftar Pengguna" />
        <Table>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Email</Th>
              <Th>Peran</Th>
              <Th>Unit Kerja</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.fullName}</Td>
                <Td className="text-xs">{u.email}</Td>
                <Td>
                  {u.appointments.map((a) => (
                    <Badge key={a.id} className="mr-1">{ROLE_LABELS[a.role.code]}</Badge>
                  ))}
                </Td>
                <Td className="text-xs">{u.appointments.map((a) => a.workUnit.name).join(", ") || "-"}</Td>
                <Td>
                  <Badge
                    className={
                      u.status === "ACTIVE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-gray-100 text-gray-600"
                    }
                  >
                    {u.status}
                  </Badge>
                </Td>
                <Td>
                  <ToggleStatusButton userId={u.id} status={u.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
