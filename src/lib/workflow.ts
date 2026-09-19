import { STAGE_BLUEPRINT } from "@/lib/constants";

export interface TimingFlags {
  overdue: boolean;
  dueSoon: boolean;
}

const DUE_SOON_WINDOW_DAYS = 5;

export function computeTiming(
  targetAt: Date | null,
  status: string
): TimingFlags {
  if (!targetAt || status === "COMPLETED" || status === "CANCELLED") {
    return { overdue: false, dueSoon: false };
  }
  const now = new Date();
  const diffMs = targetAt.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return {
    overdue: diffDays < 0,
    dueSoon: diffDays >= 0 && diffDays <= DUE_SOON_WINDOW_DAYS,
  };
}

export function stageBlueprintFor(stageCode: string) {
  return STAGE_BLUEPRINT.find((s) => s.code === stageCode);
}

interface StageDocLike {
  documentType: string;
  status: string;
}

interface ApprovalLike {
  decision: string;
  decidedAt: Date;
}

/**
 * Document gate (PRD §10.1 / BR-01): tahapan tidak dapat berstatus Selesai
 * bila dokumen wajib belum lengkap (APPROVED/FINAL), dan bila tahap
 * membutuhkan persetujuan, keputusan terakhir harus APPROVED.
 */
export function canCompleteStage(
  stageCode: string,
  documents: StageDocLike[],
  approvals: ApprovalLike[]
): { ok: boolean; missing: string[] } {
  const blueprint = stageBlueprintFor(stageCode);
  const missing: string[] = [];

  if (blueprint) {
    for (const req of blueprint.requiredDocuments) {
      const satisfied = documents.some(
        (doc) =>
          doc.documentType === req.type &&
          (doc.status === "APPROVED" || doc.status === "FINAL")
      );
      if (!satisfied) missing.push(req.label);
    }

    if (blueprint.requiresApproval) {
      const latest = [...approvals].sort(
        (a, b) => b.decidedAt.getTime() - a.decidedAt.getTime()
      )[0];
      if (!latest || latest.decision !== "APPROVED") {
        missing.push("Persetujuan reviewer berwenang");
      }
    }
  }

  return { ok: missing.length === 0, missing };
}

export function computeProgress(
  stages: { weight: number | string; status: string }[]
) {
  let total = 0;
  for (const stage of stages) {
    if (stage.status === "COMPLETED") {
      total += Number(stage.weight);
    }
  }
  return Math.min(100, Math.round(total * 100) / 100);
}
