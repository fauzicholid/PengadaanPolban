import "server-only";
import { prisma } from "@/lib/prisma";
import { computeTiming } from "@/lib/workflow";

const HIGH_VALUE_THRESHOLD = 500_000_000; // ambang nilai pagu/HPS/kontrak (dapat dikonfigurasi)

export interface RiskQueueItem {
  packageId: string;
  packageCode: string;
  packageName: string;
  value: number;
  reasons: string[];
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
}

export async function getRiskQueue(): Promise<RiskQueueItem[]> {
  const packages = await prisma.procurementPackage.findMany({
    where: {
      status: { notIn: ["SELESAI", "DIBATALKAN", "DRAFT"] },
      spiRequests: { none: { review: { reviewStatus: { not: "CLOSED" } } } },
    },
    include: {
      stages: { include: { approvals: true } },
      contract: true,
    },
  });

  const items: RiskQueueItem[] = [];

  for (const p of packages) {
    const reasons: string[] = [];
    let score = 0;

    const value = Math.max(Number(p.budgetCeiling), Number(p.hpsValue ?? 0), Number(p.contract?.contractValue ?? 0));
    if (value >= HIGH_VALUE_THRESHOLD) {
      reasons.push(`Nilai pagu/HPS/kontrak tinggi (${value.toLocaleString("id-ID")})`);
      score += 2;
    }

    const overdueStages = p.stages.filter((s) => computeTiming(s.targetAt, s.status).overdue);
    if (overdueStages.length > 0) {
      reasons.push(`${overdueStages.length} tahapan terlambat`);
      score += overdueStages.length;
    }

    const waitingDocs = p.stages.filter((s) => s.status === "WAITING_DOCUMENT");
    if (waitingDocs.length > 0) {
      reasons.push("BA/dokumen wajib belum lengkap");
      score += 1;
    }

    const revisionCount = p.stages.reduce(
      (sum, s) => sum + s.approvals.filter((a) => a.decision === "REVISION").length,
      0
    );
    if (revisionCount >= 2) {
      reasons.push(`Dikembalikan untuk perbaikan ${revisionCount} kali`);
      score += 2;
    }

    if (reasons.length === 0) continue;

    const level: RiskQueueItem["level"] = score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";

    items.push({
      packageId: p.id,
      packageCode: p.packageCode,
      packageName: p.packageName,
      value,
      reasons,
      score,
      level,
    });
  }

  return items.sort((a, b) => b.score - a.score);
}
