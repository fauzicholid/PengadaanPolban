import type { RoleCode, StageCode } from "@/generated/prisma/enums";

// Peran yang berwenang bertindak (unggah dokumen/selesaikan) pada tiap tahap.
export const STAGE_ACTOR_ROLES: Record<StageCode, RoleCode[]> = {
  RUP: [],
  PERSIAPAN: ["PPK", "STAF_PPK"],
  // Reviu berbasis risiko: PPK menyelesaikan langsung untuk paket bernilai
  // wajar; hanya paket bernilai tinggi yang wajib melalui reviu SPI
  // (lihat submitStageForApprovalAction/decideStageApprovalAction).
  REVIU: ["PPK"],
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

// Derives which stage codes a role may act on from the single source of
// truth above, instead of hand-copying the list at each call site (that
// drift is exactly what let REVIU:["KPA"] survive in package.ts after the
// role was removed from STAGE_ACTOR_ROLES).
export function stagesForRole(role: RoleCode): StageCode[] {
  return (Object.keys(STAGE_ACTOR_ROLES) as StageCode[]).filter((code) =>
    STAGE_ACTOR_ROLES[code].includes(role)
  );
}
