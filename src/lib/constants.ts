import type { RoleCode, StageCode, PackageStatus } from "@/generated/prisma/enums";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "Sistem Informasi Pengadaan Barang/Jasa Polban";

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: "Admin",
  KPA: "KPA",
  PPK: "PPK",
  STAF_PPK: "Staf PPK",
  PEJABAT_PENGADAAN: "Pejabat Pengadaan",
  SPI: "SPI",
  PENYEDIA: "Penyedia",
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  ADMIN:
    "Konfigurasi sistem, pengguna, role, referensi, integrasi; tidak otomatis memiliki kewenangan pengadaan.",
  KPA: "Monitoring dan reviu/persetujuan sesuai pelimpahan kewenangan.",
  PPK: "Persiapan paket, HPS, kontrak, pengendalian pelaksanaan, tindak lanjut.",
  STAF_PPK: "Menyusun draf dan administrasi; tidak dapat melakukan persetujuan final PPK.",
  PEJABAT_PENGADAAN: "Review paket dan proses pemilihan sesuai kewenangan.",
  SPI: "Reviu/pengawasan internal, catatan/temuan, verifikasi tindak lanjut.",
  PENYEDIA: "Registrasi, profil, dokumen, penawaran, tindak lanjut proses yang dibuka kepadanya.",
};

export const ALL_ROLES: RoleCode[] = [
  "ADMIN",
  "KPA",
  "PPK",
  "STAF_PPK",
  "PEJABAT_PENGADAAN",
  "SPI",
  "PENYEDIA",
];

// Peran internal instansi (bukan portal penyedia)
export const INTERNAL_ROLES: RoleCode[] = [
  "ADMIN",
  "KPA",
  "PPK",
  "STAF_PPK",
  "PEJABAT_PENGADAAN",
  "SPI",
];

export const VENDOR_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Sedang Diverifikasi",
  REVISION: "Perlu Perbaikan",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  SUSPENDED: "Dinonaktifkan Sementara",
  EXPIRED: "Dokumen Kedaluwarsa",
};

export const PACKAGE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  RUP: "RUP",
  PERSIAPAN: "Persiapan",
  REVIU: "Reviu",
  PEMILIHAN: "Pemilihan",
  EVALUASI: "Evaluasi",
  NEGOSIASI: "Negosiasi/Hasil",
  KONTRAK: "Kontrak",
  PELAKSANAAN: "Pelaksanaan",
  SERAH_TERIMA: "Serah Terima",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const STAGE_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Belum Dimulai",
  IN_PROGRESS: "Sedang Diproses",
  WAITING_DOCUMENT: "Menunggu Dokumen",
  WAITING_APPROVAL: "Menunggu Persetujuan",
  REVISION: "Perlu Perbaikan",
  DUE_SOON: "Mendekati Batas Waktu",
  OVERDUE: "Terlambat",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const STAGE_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  WAITING_DOCUMENT: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING_APPROVAL: "bg-violet-50 text-violet-700 border-violet-200",
  REVISION: "bg-orange-50 text-orange-700 border-orange-200",
  DUE_SOON: "bg-yellow-50 text-yellow-800 border-yellow-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  UPLOADED: "Diunggah",
  UNDER_REVIEW: "Sedang Direviu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  FINAL: "Final",
};

export const SPI_STATUS_LABELS: Record<string, string> = {
  NOT_REVIEWED: "Belum Direviu",
  UNDER_REVIEW: "Sedang Direviu",
  CLARIFICATION: "Memerlukan Klarifikasi",
  FOLLOW_UP_REQUIRED: "Perlu Tindak Lanjut",
  FOLLOW_UP_PROCESS: "Tindak Lanjut Diproses",
  FOLLOW_UP_VERIFICATION: "Verifikasi Tindak Lanjut",
  CLOSED: "Reviu Selesai",
};

export const FINDING_STATUS_LABELS: Record<string, string> = {
  FOLLOW_UP_REQUIRED: "Perlu Tindak Lanjut",
  FOLLOW_UP_PROCESS: "Tindak Lanjut Diproses",
  FOLLOW_UP_VERIFICATION: "Verifikasi Tindak Lanjut",
  RESOLVED: "Selesai",
  REVISION: "Perlu Perbaikan",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  ACTIVE: "Kontrak Berjalan",
  ADDENDUM: "Addendum",
  COMPLETED: "Selesai",
  TERMINATED: "Dihentikan",
};

export const BID_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Penawaran Terkirim",
  ADMINISTRATION_PASSED: "Lulus Administrasi",
  ADMINISTRATION_FAILED: "Gugur Administrasi",
  TECHNICAL_PASSED: "Lulus Teknis",
  TECHNICAL_FAILED: "Gugur Teknis",
  PRICE_EVALUATED: "Evaluasi Harga",
  WINNER: "Pemenang",
  LOSER: "Tidak Terpilih",
  WITHDRAWN: "Mengundurkan Diri",
};

// Tahapan baku pengadaan beserta bobot progres (total 100%) sesuai PRD §16.
export interface StageBlueprint {
  code: StageCode;
  name: string;
  sequenceNo: number;
  weight: number;
  requiredDocuments: { type: string; label: string }[];
  requiresApproval: boolean;
}

export const STAGE_BLUEPRINT: StageBlueprint[] = [
  {
    code: "RUP",
    name: "RUP",
    sequenceNo: 1,
    weight: 5,
    requiredDocuments: [],
    requiresApproval: false,
  },
  {
    code: "PERSIAPAN",
    name: "Persiapan Paket",
    sequenceNo: 2,
    weight: 15,
    requiredDocuments: [
      { type: "KAK_SPESIFIKASI", label: "KAK/Spesifikasi" },
      { type: "HPS", label: "HPS" },
    ],
    requiresApproval: false,
  },
  {
    code: "REVIU",
    name: "Reviu",
    sequenceNo: 3,
    weight: 10,
    requiredDocuments: [{ type: "BA_REVIU", label: "BA/Daftar Periksa Reviu" }],
    // requiresApproval bersifat statis untuk tahap lain; khusus REVIU nilainya
    // ditimpa secara dinamis berbasis nilai paket (lihat isHighValuePackage) —
    // true di sini hanya sebagai default bila override tidak diberikan.
    requiresApproval: true,
  },
  {
    code: "PEMILIHAN",
    name: "Pemilihan Penyedia",
    sequenceNo: 4,
    weight: 15,
    requiredDocuments: [{ type: "DOKUMEN_PEMILIHAN", label: "Undangan/Dokumen Pemilihan" }],
    requiresApproval: false,
  },
  {
    code: "EVALUASI",
    name: "Evaluasi",
    sequenceNo: 5,
    weight: 15,
    requiredDocuments: [{ type: "BA_EVALUASI", label: "BA Evaluasi" }],
    requiresApproval: false,
  },
  {
    code: "NEGOSIASI",
    name: "Klarifikasi/Negosiasi & Hasil",
    sequenceNo: 6,
    weight: 10,
    requiredDocuments: [{ type: "BA_HASIL", label: "BA Hasil Pemilihan" }],
    requiresApproval: false,
  },
  {
    code: "KONTRAK",
    name: "Kontrak/SPK",
    sequenceNo: 7,
    weight: 10,
    requiredDocuments: [{ type: "SPK_KONTRAK", label: "SPK/Kontrak" }],
    requiresApproval: false,
  },
  {
    code: "PELAKSANAAN",
    name: "Pelaksanaan",
    sequenceNo: 8,
    weight: 15,
    requiredDocuments: [],
    requiresApproval: false,
  },
  {
    code: "BAST",
    name: "Serah Terima",
    sequenceNo: 9,
    weight: 5,
    requiredDocuments: [{ type: "BAST", label: "BAST" }],
    requiresApproval: false,
  },
];

// Jenis dokumen "Berita Acara"/administratif yang dapat digenerate otomatis
// oleh sistem (diisi Staf PPK), lalu divalidasi lewat tanda tangan digital
// (nama, waktu, kode verifikasi + QR) alih-alih proses cetak-tanda tangan-pindai manual.
export const GENERATABLE_DOCUMENT_TYPES = ["BA_REVIU", "BA_EVALUASI", "BA_HASIL", "BAST"] as const;
export type GeneratableDocumentType = (typeof GENERATABLE_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  KAK_SPESIFIKASI: "KAK/Spesifikasi",
  HPS: "HPS",
  BA_REVIU: "Berita Acara Reviu",
  DOKUMEN_PEMILIHAN: "Undangan/Dokumen Pemilihan",
  BA_EVALUASI: "Berita Acara Evaluasi",
  BA_HASIL: "Berita Acara Hasil Pemilihan",
  SPK_KONTRAK: "SPK/Kontrak",
  BAST: "Berita Acara Serah Terima",
};

// Peran yang tanda tangannya wajib ada agar dokumen generate berstatus final.
// Urutan dalam array mencerminkan urutan tanda tangan yang disyaratkan
// (mis. BAST: PPK menandatangani lebih dulu bersama penyedia, baru kemudian
// diserahterimakan ke KPA selaku Pengguna Anggaran untuk ditandatangani).
export type DocumentSignerRole = "PPK" | "PENYEDIA" | "KPA";
export const DOCUMENT_REQUIRED_SIGNERS: Record<string, DocumentSignerRole[]> = {
  BA_REVIU: ["PPK"],
  BA_EVALUASI: ["PPK"],
  BA_HASIL: ["PPK", "PENYEDIA"],
  BAST: ["PPK", "PENYEDIA", "KPA"],
};

export const STAGE_TO_PACKAGE_STATUS: Record<StageCode, PackageStatus> = {
  RUP: "RUP",
  PERSIAPAN: "PERSIAPAN",
  REVIU: "REVIU",
  PEMILIHAN: "PEMILIHAN",
  EVALUASI: "EVALUASI",
  NEGOSIASI: "NEGOSIASI",
  KONTRAK: "KONTRAK",
  PELAKSANAAN: "PELAKSANAAN",
  BAST: "SERAH_TERIMA",
};

export const STATUS_VISUAL = {
  ON_SCHEDULE: { label: "Sesuai Jadwal", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  NEEDS_ATTENTION: { label: "Perlu Perhatian", color: "text-amber-700 bg-amber-50 border-amber-200" },
  DUE_SOON: { label: "Mendekati Batas Waktu", color: "text-yellow-800 bg-yellow-50 border-yellow-200" },
  OVERDUE: { label: "Terlambat", color: "text-red-700 bg-red-50 border-red-200" },
  NOT_STARTED: { label: "Belum Dimulai", color: "text-slate-600 bg-slate-100 border-slate-200" },
};

export const MENU_STRUCTURE: {
  section: string;
  items: { label: string; href: string; roles: RoleCode[] }[];
}[] = [
  {
    section: "Dasbor",
    items: [
      { label: "Ringkasan Eksekutif", href: "/dashboard", roles: ALL_ROLES },
    ],
  },
  {
    section: "Perencanaan",
    items: [
      {
        label: "RUP",
        href: "/rup",
        roles: ["ADMIN", "KPA", "PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "SPI"],
      },
    ],
  },
  {
    section: "Pengadaan",
    items: [
      {
        label: "Semua Paket",
        href: "/packages",
        roles: ["ADMIN", "KPA", "PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "SPI"],
      },
      { label: "Buat Paket dari RUP", href: "/packages/new", roles: ["PPK"] },
    ],
  },
  {
    section: "Penyedia",
    items: [
      { label: "Direktori & Verifikasi", href: "/vendors", roles: ["ADMIN", "STAF_PPK", "PPK", "PEJABAT_PENGADAAN", "KPA", "SPI"] },
      { label: "Profil Perusahaan", href: "/vendor/profile", roles: ["PENYEDIA"] },
      { label: "Undangan", href: "/vendor/invitations", roles: ["PENYEDIA"] },
      { label: "Penawaran", href: "/vendor/bids", roles: ["PENYEDIA"] },
    ],
  },
  {
    section: "Pengawasan Internal",
    items: [
      { label: "Dasbor SPI", href: "/spi", roles: ["SPI", "ADMIN"] },
      { label: "Permintaan Reviu", href: "/spi/requests", roles: ["SPI", "KPA", "PPK"] },
      { label: "Reviu Berbasis Risiko", href: "/spi/risk", roles: ["SPI"] },
      { label: "Tindak Lanjut", href: "/spi/followups", roles: ["SPI", "PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "KPA"] },
    ],
  },
  {
    section: "Administrasi",
    items: [
      { label: "Pengguna & Penugasan", href: "/admin/users", roles: ["ADMIN"] },
      { label: "Master KBLI", href: "/admin/kbli", roles: ["ADMIN"] },
      { label: "Jejak Audit", href: "/audit-logs", roles: ["ADMIN", "SPI"] },
    ],
  },
];
