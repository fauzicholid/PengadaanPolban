import type { RoleCode, StageCode } from "@/generated/prisma/enums";

// Peran yang berwenang bertindak (unggah dokumen/selesaikan) pada tiap tahap.
export const STAGE_ACTOR_ROLES: Record<StageCode, RoleCode[]> = {
  RUP: [],
  PERSIAPAN: ["PPK", "STAF_PPK"],
  REVIU: ["PPK", "KPA"],
  PEMILIHAN: ["PEJABAT_PENGADAAN"],
  EVALUASI: ["PEJABAT_PENGADAAN"],
  NEGOSIASI: ["PEJABAT_PENGADAAN"],
  KONTRAK: ["PPK"],
  PELAKSANAAN: ["PPK", "STAF_PPK"],
  BAST: ["PPK"],
};

export function canActOnStage(role: RoleCode, stageCode: StageCode) {
  return STAGE_ACTOR_ROLES[stageCode].includes(role);
}
