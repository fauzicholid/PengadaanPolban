import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { computeTiming } from "@/lib/workflow";
import { PACKAGE_STATUS_LABELS } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

async function scopedPackageWhere(
  session: SessionPayload
): Promise<Prisma.ProcurementPackageWhereInput> {
  switch (session.role) {
    case "PPK":
      return { ppkUserId: session.userId };
    case "STAF_PPK":
      return { stages: { some: { picUserId: session.userId } } };
    case "PEJABAT_PENGADAAN":
      return {
        stages: {
          some: {
            picUserId: session.userId,
            stageCode: { in: ["PEMILIHAN", "EVALUASI", "NEGOSIASI"] },
          },
        },
      };
    case "PENYEDIA": {
      if (!session.vendorId) return { id: "__none__" };
      return {
        OR: [
          { bids: { some: { vendorId: session.vendorId } } },
          { invitations: { some: { vendorId: session.vendorId } } },
          { contract: { vendorId: session.vendorId } },
        ],
      };
    }
    default:
      // ADMIN, KPA, SPI: lingkup instansi (semua unit dalam MVP satu organisasi)
      return {};
  }
}

export async function getDashboardData(session: SessionPayload) {
  const where = await scopedPackageWhere(session);

  const packages = await prisma.procurementPackage.findMany({
    where,
    include: {
      rup: { include: { workUnit: true } },
      ppk: true,
      stages: { orderBy: { sequenceNo: "asc" } },
      contract: { include: { milestones: true } },
      spiRequests: { include: { review: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPagu = packages.reduce((sum, p) => sum + Number(p.budgetCeiling), 0);
  const totalHps = packages.reduce((sum, p) => sum + Number(p.hpsValue ?? 0), 0);
  const totalKontrak = packages.reduce(
    (sum, p) => sum + Number(p.contract?.contractValue ?? 0),
    0
  );
  const totalRealisasi = packages.reduce((sum, p) => {
    const contract = p.contract;
    if (!contract || contract.milestones.length === 0) return sum;
    const avgProgress =
      contract.milestones.reduce((s, m) => s + Number(m.progressPercent), 0) /
      contract.milestones.length;
    return sum + (Number(contract.contractValue) * avgProgress) / 100;
  }, 0);

  const statusCounts: Record<string, number> = {};
  for (const p of packages) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }

  let overdueCount = 0;
  let dueSoonCount = 0;
  let waitingApprovalCount = 0;
  let waitingDocumentCount = 0;
  const criticalPackages: {
    id: string;
    packageCode: string;
    packageName: string;
    ppkName: string;
    value: number;
    currentStage: string;
    overdue: boolean;
    dueSoon: boolean;
    missingDocs: boolean;
  }[] = [];

  for (const p of packages) {
    const currentStage =
      p.stages.find((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED") ??
      p.stages[p.stages.length - 1];
    let hasOverdue = false;
    let hasDueSoon = false;
    for (const stage of p.stages) {
      const timing = computeTiming(stage.targetAt, stage.status);
      if (timing.overdue) hasOverdue = true;
      if (timing.dueSoon) hasDueSoon = true;
      if (stage.status === "WAITING_APPROVAL") waitingApprovalCount += 1;
      if (stage.status === "WAITING_DOCUMENT") waitingDocumentCount += 1;
    }
    if (hasOverdue) overdueCount += 1;
    if (hasDueSoon) dueSoonCount += 1;
    if (hasOverdue || hasDueSoon) {
      criticalPackages.push({
        id: p.id,
        packageCode: p.packageCode,
        packageName: p.packageName,
        ppkName: p.ppk.fullName,
        value: Number(p.budgetCeiling),
        currentStage: currentStage ? currentStage.stageName : "-",
        overdue: hasOverdue,
        dueSoon: hasDueSoon,
        missingDocs: currentStage?.status === "WAITING_DOCUMENT",
      });
    }
  }

  const completedCount = packages.filter((p) => p.status === "SELESAI").length;
  const runningCount = packages.filter(
    (p) => p.status !== "SELESAI" && p.status !== "DIBATALKAN" && p.status !== "DRAFT"
  ).length;

  const spiUnderReview = packages.filter((p) =>
    p.spiRequests.some(
      (r) =>
        r.review &&
        ["UNDER_REVIEW", "CLARIFICATION"].includes(r.review.reviewStatus)
    )
  ).length;
  const spiFollowUp = packages.filter((p) =>
    p.spiRequests.some(
      (r) => r.review && r.review.reviewStatus === "FOLLOW_UP_REQUIRED"
    )
  ).length;

  const pipeline = [
    { code: "RUP", label: "RUP", count: packages.length },
    {
      code: "PERSIAPAN",
      label: "Persiapan",
      count: packages.filter((p) =>
        [
          "PERSIAPAN",
          "REVIU",
          "PEMILIHAN",
          "EVALUASI",
          "NEGOSIASI",
          "KONTRAK",
          "PELAKSANAAN",
          "SERAH_TERIMA",
          "SELESAI",
        ].includes(p.status)
      ).length,
    },
    {
      code: "PEMILIHAN",
      label: "Pemilihan",
      count: packages.filter((p) =>
        ["PEMILIHAN", "EVALUASI", "NEGOSIASI", "KONTRAK", "PELAKSANAAN", "SERAH_TERIMA", "SELESAI"].includes(
          p.status
        )
      ).length,
    },
    {
      code: "KONTRAK",
      label: "Kontrak",
      count: packages.filter((p) =>
        ["KONTRAK", "PELAKSANAAN", "SERAH_TERIMA", "SELESAI"].includes(p.status)
      ).length,
    },
    {
      code: "PELAKSANAAN",
      label: "Pelaksanaan",
      count: packages.filter((p) => ["PELAKSANAAN", "SERAH_TERIMA", "SELESAI"].includes(p.status))
        .length,
    },
    { code: "SELESAI", label: "Selesai", count: completedCount },
  ];

  return {
    totalPagu,
    totalHps,
    totalKontrak,
    totalRealisasi,
    sisaAnggaran: totalPagu - totalKontrak,
    totalPackages: packages.length,
    runningCount,
    completedCount,
    overdueCount,
    dueSoonCount,
    waitingApprovalCount,
    waitingDocumentCount,
    spiUnderReview,
    spiFollowUp,
    statusCounts,
    pipeline,
    criticalPackages: criticalPackages
      .sort((a, b) => Number(b.overdue) - Number(a.overdue))
      .slice(0, 8),
    recentPackages: packages.slice(0, 8),
  };
}

export function statusLabel(code: string) {
  return PACKAGE_STATUS_LABELS[code] ?? code;
}
