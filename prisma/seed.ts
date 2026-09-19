import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "polban123";

const STAGE_BLUEPRINT = [
  { code: "RUP", name: "RUP", sequenceNo: 1, weight: 5, docs: [] as string[] },
  { code: "PERSIAPAN", name: "Persiapan Paket", sequenceNo: 2, weight: 15, docs: ["KAK_SPESIFIKASI", "HPS"] },
  { code: "REVIU", name: "Reviu KPA", sequenceNo: 3, weight: 10, docs: ["BA_REVIU"] },
  { code: "PEMILIHAN", name: "Pemilihan Penyedia", sequenceNo: 4, weight: 15, docs: ["DOKUMEN_PEMILIHAN"] },
  { code: "EVALUASI", name: "Evaluasi", sequenceNo: 5, weight: 15, docs: ["BA_EVALUASI"] },
  { code: "NEGOSIASI", name: "Klarifikasi/Negosiasi & Hasil", sequenceNo: 6, weight: 10, docs: ["BA_HASIL"] },
  { code: "KONTRAK", name: "Kontrak/SPK", sequenceNo: 7, weight: 10, docs: ["SPK_KONTRAK"] },
  { code: "PELAKSANAAN", name: "Pelaksanaan", sequenceNo: 8, weight: 15, docs: [] },
  { code: "BAST", name: "Serah Terima", sequenceNo: 9, weight: 5, docs: ["BAST"] },
] as const;

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // --- Organisasi & Unit Kerja ---
  const org = await prisma.organization.upsert({
    where: { code: "POLBAN" },
    update: {},
    create: { code: "POLBAN", name: "Politeknik Negeri Bandung" },
  });

  const workUnitData = [
    { code: "UPBJ", name: "Unit Layanan Pengadaan Barang/Jasa" },
    { code: "JTE", name: "Jurusan Teknik Elektro" },
    { code: "JTS", name: "Jurusan Teknik Sipil" },
    { code: "SPI", name: "Satuan Pengawasan Internal" },
  ];
  const workUnits: Record<string, { id: string }> = {};
  for (const wu of workUnitData) {
    workUnits[wu.code] = await prisma.workUnit.upsert({
      where: { organizationId_code: { organizationId: org.id, code: wu.code } },
      update: {},
      create: { organizationId: org.id, code: wu.code, name: wu.name },
    });
  }

  // --- Roles & Permissions ---
  const roleData: { code: string; name: string }[] = [
    { code: "ADMIN", name: "Admin" },
    { code: "KPA", name: "KPA" },
    { code: "PPK", name: "PPK" },
    { code: "STAF_PPK", name: "Staf PPK" },
    { code: "PEJABAT_PENGADAAN", name: "Pejabat Pengadaan" },
    { code: "SPI", name: "SPI" },
    { code: "PENYEDIA", name: "Penyedia" },
  ];
  const roles: Record<string, { id: string }> = {};
  for (const r of roleData) {
    roles[r.code] = await prisma.role.upsert({
      where: { code: r.code as never },
      update: {},
      create: { code: r.code as never, name: r.name },
    });
  }

  const permissionData = [
    { code: "manage_users", name: "Kelola Pengguna", roles: ["ADMIN"] },
    { code: "view_rup", name: "Lihat RUP", roles: ["ADMIN", "KPA", "PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "SPI"] },
    { code: "create_package", name: "Buat Paket", roles: ["PPK"] },
    { code: "review_package", name: "Reviu Paket", roles: ["KPA", "SPI"] },
    { code: "manage_hps", name: "Buat/Setujui HPS", roles: ["PPK"] },
    { code: "process_selection", name: "Proses Pemilihan", roles: ["PEJABAT_PENGADAAN"] },
    { code: "view_ba", name: "Lihat BA", roles: ["ADMIN", "KPA", "PPK", "STAF_PPK", "PEJABAT_PENGADAAN", "SPI"] },
    { code: "manage_contract", name: "Kelola Kontrak", roles: ["PPK"] },
    { code: "review_note", name: "Catatan Reviu", roles: ["KPA", "SPI"] },
    { code: "spi_followup", name: "Tindak Lanjut SPI", roles: ["SPI"] },
    { code: "view_audit", name: "Jejak Audit", roles: ["ADMIN", "SPI"] },
  ];
  for (const p of permissionData) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, name: p.name },
    });
    for (const roleCode of p.roles) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles[roleCode].id, permissionId: perm.id } },
        update: {},
        create: { roleId: roles[roleCode].id, permissionId: perm.id },
      });
    }
  }

  // --- Users ---
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  async function upsertUser(email: string, fullName: string) {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, fullName, passwordHash, status: "ACTIVE" },
    });
  }
  async function appoint(userId: string, roleCode: string, workUnitCode: string, skNumber: string) {
    const existing = await prisma.appointment.findFirst({ where: { userId, roleId: roles[roleCode].id } });
    if (existing) return existing;
    return prisma.appointment.create({
      data: {
        userId,
        roleId: roles[roleCode].id,
        workUnitId: workUnits[workUnitCode].id,
        skNumber,
        validFrom: new Date("2026-01-01"),
        active: true,
      },
    });
  }

  const admin = await upsertUser("admin@polban.ac.id", "Dedi Setiawan (Admin)");
  await appoint(admin.id, "ADMIN", "UPBJ", "SK/ADM/2026/001");

  const kpa = await upsertUser("kpa@polban.ac.id", "Dr. Ratna Wijayanti, M.T. (KPA)");
  await appoint(kpa.id, "KPA", "UPBJ", "SK/KPA/2026/001");

  const ppk = await upsertUser("ppk@polban.ac.id", "Agus Prasetyo, S.T. (PPK)");
  await appoint(ppk.id, "PPK", "UPBJ", "SK/PPK/2026/001");

  const stafPpk = await upsertUser("stafppk@polban.ac.id", "Rina Amelia (Staf PPK)");
  await appoint(stafPpk.id, "STAF_PPK", "UPBJ", "SK/STAF/2026/001");

  const pejabat = await upsertUser("pejabatpengadaan@polban.ac.id", "Bambang Hermawan (Pejabat Pengadaan)");
  await appoint(pejabat.id, "PEJABAT_PENGADAAN", "UPBJ", "SK/PP/2026/001");

  const spi = await upsertUser("spi@polban.ac.id", "Siti Nurhaliza, Ak. (SPI)");
  await appoint(spi.id, "SPI", "SPI", "SK/SPI/2026/001");

  const vendorUser = await upsertUser("vendor@mitrateknik.co.id", "Hendra Gunawan (PT Mitra Teknik Nusantara)");
  const vendorUser2 = await upsertUser("vendor@sumberjaya.co.id", "Dewi Lestari (CV Sumber Jaya Konstruksi)");

  // --- KBLI Master ---
  const kbliData = [
    { code: "46510", title: "Perdagangan Besar Komputer dan Perlengkapannya", version: "2020" },
    { code: "43210", title: "Instalasi Listrik", version: "2020" },
    { code: "62010", title: "Aktivitas Pemrograman Komputer", version: "2020" },
    { code: "41016", title: "Konstruksi Gedung Pendidikan", version: "2020" },
    { code: "47899", title: "Perdagangan Eceran Alat Tulis Kantor", version: "2020" },
  ];
  const kbli: Record<string, { id: string }> = {};
  for (const k of kbliData) {
    kbli[k.code] = await prisma.kbliMaster.upsert({
      where: { code_version: { code: k.code, version: k.version } },
      update: {},
      create: k,
    });
  }

  // --- Vendors ---
  const vendorA = await prisma.vendor.upsert({
    where: { nib: "9120000123456" },
    update: {},
    create: {
      nib: "9120000123456",
      npwp: "01.234.567.8-999.000",
      companyName: "PT Mitra Teknik Nusantara",
      companyType: "PT",
      email: "vendor@mitrateknik.co.id",
      phone: "022-1234567",
      address: "Jl. Soekarno Hatta No. 123, Bandung",
      directorName: "Hendra Gunawan",
      verificationStatus: "VERIFIED",
      users: { create: { userId: vendorUser.id } },
      kbli: {
        create: [
          { kbliId: kbli["46510"].id, licenseStatus: "Berlaku" },
          { kbliId: kbli["43210"].id, licenseStatus: "Berlaku" },
        ],
      },
      legalDocuments: {
        create: [
          {
            documentType: "NIB",
            documentNumber: "9120000123456",
            issuedAt: new Date("2022-03-10"),
            fileUri: "nib-mitrateknik.pdf",
            checksum: "sha256-demo1",
            status: "FINAL",
          },
          {
            documentType: "Izin Usaha",
            documentNumber: "IU/2022/00981",
            issuedAt: new Date("2022-03-15"),
            expiresAt: daysFromNow(400),
            fileUri: "izin-usaha-mitrateknik.pdf",
            checksum: "sha256-demo2",
            status: "APPROVED",
          },
        ],
      },
      verifications: {
        create: { verifierId: admin.id, decision: "VERIFIED", notes: "Dokumen lengkap dan sesuai." },
      },
    },
  });

  await prisma.vendor.upsert({
    where: { nib: "9120000998877" },
    update: {},
    create: {
      nib: "9120000998877",
      npwp: "02.345.678.9-888.000",
      companyName: "CV Sumber Jaya Konstruksi",
      companyType: "CV",
      email: "vendor@sumberjaya.co.id",
      phone: "022-9876543",
      address: "Jl. Dago No. 45, Bandung",
      directorName: "Dewi Lestari",
      verificationStatus: "SUBMITTED",
      users: { create: { userId: vendorUser2.id } },
      kbli: { create: [{ kbliId: kbli["41016"].id, licenseStatus: "Berlaku" }] },
      legalDocuments: {
        create: [
          {
            documentType: "NIB",
            documentNumber: "9120000998877",
            issuedAt: new Date("2023-01-05"),
            fileUri: "nib-sumberjaya.pdf",
            checksum: "sha256-demo3",
            status: "UPLOADED",
          },
        ],
      },
    },
  });

  // --- RUP ---
  const rupA = await prisma.rup.upsert({
    where: { externalRupId_fiscalYear: { externalRupId: "RUP-2026-000101", fiscalYear: 2026 } },
    update: {},
    create: {
      workUnitId: workUnits.JTE.id,
      externalRupId: "RUP-2026-000101",
      fiscalYear: 2026,
      packageName: "Pengadaan Peralatan Laboratorium Jaringan Komputer",
      procurementType: "Barang",
      procurementMethod: "Tender Cepat",
      budgetCeiling: 850_000_000,
      sourceFund: "BLU",
      location: "Kampus Polban, Bandung",
      volume: "1 paket",
      source: "API_SIRUP",
      syncAt: new Date(),
    },
  });

  const rupB = await prisma.rup.upsert({
    where: { externalRupId_fiscalYear: { externalRupId: "RUP-2026-000102", fiscalYear: 2026 } },
    update: {},
    create: {
      workUnitId: workUnits.JTS.id,
      externalRupId: "RUP-2026-000102",
      fiscalYear: 2026,
      packageName: "Jasa Konsultansi Pengawasan Renovasi Gedung Kuliah",
      procurementType: "Jasa Konsultansi",
      procurementMethod: "Seleksi",
      budgetCeiling: 420_000_000,
      sourceFund: "RM",
      location: "Kampus Polban, Bandung",
      volume: "1 paket",
      source: "API_SIRUP",
      syncAt: new Date(),
    },
  });

  const rupC = await prisma.rup.upsert({
    where: { externalRupId_fiscalYear: { externalRupId: "RUP-2026-000103", fiscalYear: 2026 } },
    update: {},
    create: {
      workUnitId: workUnits.UPBJ.id,
      externalRupId: "RUP-2026-000103",
      fiscalYear: 2026,
      packageName: "Pengadaan Alat Tulis Kantor Tahunan",
      procurementType: "Barang",
      procurementMethod: "Pengadaan Langsung",
      budgetCeiling: 95_000_000,
      sourceFund: "PNBP",
      location: "Kampus Polban, Bandung",
      volume: "1 paket",
      source: "MANUAL_IMPORT",
      syncAt: new Date(),
    },
  });

  // Helper untuk membuat paket lengkap dengan tahapan dari blueprint
  async function createPackage(opts: {
    code: string;
    rupId: string;
    name: string;
    procurementType: string;
    budget: number;
    hps?: number;
  }) {
    const existing = await prisma.procurementPackage.findUnique({ where: { packageCode: opts.code } });
    if (existing) return existing;
    return prisma.procurementPackage.create({
      data: {
        packageCode: opts.code,
        rupId: opts.rupId,
        ppkUserId: ppk.id,
        packageName: opts.name,
        procurementType: opts.procurementType,
        status: "PERSIAPAN",
        budgetCeiling: opts.budget,
        hpsValue: opts.hps,
        stages: {
          create: STAGE_BLUEPRINT.map((bp) => ({
            stageCode: bp.code as never,
            stageName: bp.name,
            sequenceNo: bp.sequenceNo,
            weight: bp.weight,
            status: bp.code === "RUP" ? "COMPLETED" : bp.code === "PERSIAPAN" ? "IN_PROGRESS" : "NOT_STARTED",
            startAt: bp.code === "RUP" || bp.code === "PERSIAPAN" ? new Date() : null,
            completedAt: bp.code === "RUP" ? new Date() : null,
            picUserId: bp.code === "PERSIAPAN" ? ppk.id : bp.code === "KONTRAK" || bp.code === "PELAKSANAAN" || bp.code === "BAST" ? ppk.id : null,
            documents: {
              create: bp.docs.map((d) => ({ documentType: d, required: true, status: "DRAFT" as const })),
            },
          })),
        },
      },
    });
  }

  // Paket A: sudah maju sampai Pelaksanaan (untuk demo kontrak & milestone)
  const pkgA = await createPackage({
    code: "PBJ-2026-JTE-00001",
    rupId: rupA.id,
    name: "Pengadaan Peralatan Laboratorium Jaringan Komputer",
    procurementType: "Barang",
    budget: 850_000_000,
    hps: 830_000_000,
  });

  const stagesA = await prisma.packageStage.findMany({ where: { packageId: pkgA.id }, orderBy: { sequenceNo: "asc" } });
  const stageMapA = Object.fromEntries(stagesA.map((s) => [s.stageCode, s]));

  // Lengkapi & selesaikan Persiapan
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapA.PERSIAPAN.id },
    data: { status: "APPROVED", fileUri: "kak-hps-lab-jaringan.pdf", uploadedById: ppk.id, uploadedAt: new Date() },
  });
  await prisma.packageStage.update({
    where: { id: stageMapA.PERSIAPAN.id },
    data: { status: "COMPLETED", completedAt: daysFromNow(-40) },
  });
  await prisma.procurementPackage.update({ where: { id: pkgA.id }, data: { kakSummary: "Pengadaan 40 unit switch dan access point untuk laboratorium jaringan.", specification: "Sesuai spesifikasi teknis terlampir." } });

  // Reviu KPA - selesai disetujui
  await prisma.packageStage.update({
    where: { id: stageMapA.REVIU.id },
    data: { status: "COMPLETED", startAt: daysFromNow(-39), completedAt: daysFromNow(-35), picUserId: kpa.id },
  });
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapA.REVIU.id },
    data: { status: "FINAL", fileUri: "ba-reviu-lab-jaringan.pdf", uploadedById: ppk.id, uploadedAt: daysFromNow(-36) },
  });
  await prisma.stageApproval.create({
    data: { stageId: stageMapA.REVIU.id, approverUserId: kpa.id, decision: "APPROVED", notes: "Disetujui, anggaran dan spesifikasi sesuai.", decidedAt: daysFromNow(-35) },
  });

  // Pemilihan & Evaluasi - selesai, dengan pemenang
  await prisma.packageStage.updateMany({
    where: { id: { in: [stageMapA.PEMILIHAN.id, stageMapA.EVALUASI.id, stageMapA.NEGOSIASI.id] } },
    data: { picUserId: pejabat.id },
  });
  await prisma.packageStage.update({
    where: { id: stageMapA.PEMILIHAN.id },
    data: { status: "COMPLETED", startAt: daysFromNow(-34), completedAt: daysFromNow(-28) },
  });
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapA.PEMILIHAN.id },
    data: { status: "FINAL", fileUri: "dokumen-pemilihan-lab-jaringan.pdf", uploadedById: pejabat.id, uploadedAt: daysFromNow(-30) },
  });

  const invitation = await prisma.procurementInvitation.create({
    data: { packageId: pkgA.id, vendorId: vendorA.id, invitedAt: daysFromNow(-33), deadlineAt: daysFromNow(-29), responded: true },
  });
  const bid = await prisma.bid.create({
    data: {
      packageId: pkgA.id,
      vendorId: vendorA.id,
      offeredValue: 812_500_000,
      status: "WINNER",
      submittedAt: daysFromNow(-30),
    },
  });
  await prisma.evaluation.createMany({
    data: [
      { bidId: bid.id, stage: "ADMINISTRASI", result: "LULUS", evaluatedAt: daysFromNow(-29) },
      { bidId: bid.id, stage: "TEKNIS", result: "LULUS", evaluatedAt: daysFromNow(-28) },
      { bidId: bid.id, stage: "HARGA", result: "LULUS", notes: "Harga wajar di bawah HPS.", evaluatedAt: daysFromNow(-27) },
    ],
  });

  await prisma.packageStage.update({
    where: { id: stageMapA.EVALUASI.id },
    data: { status: "COMPLETED", startAt: daysFromNow(-29), completedAt: daysFromNow(-27) },
  });
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapA.EVALUASI.id },
    data: { status: "FINAL", fileUri: "ba-evaluasi-lab-jaringan.pdf", uploadedById: pejabat.id, uploadedAt: daysFromNow(-27) },
  });

  await prisma.packageStage.update({
    where: { id: stageMapA.NEGOSIASI.id },
    data: { status: "COMPLETED", startAt: daysFromNow(-26), completedAt: daysFromNow(-24) },
  });
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapA.NEGOSIASI.id },
    data: { status: "FINAL", fileUri: "ba-hasil-lab-jaringan.pdf", uploadedById: pejabat.id, uploadedAt: daysFromNow(-24) },
  });

  // Kontrak - selesai, Pelaksanaan sedang berjalan (salah satu milestone terlambat)
  await prisma.packageStage.update({
    where: { id: stageMapA.KONTRAK.id },
    data: { status: "COMPLETED", startAt: daysFromNow(-23), completedAt: daysFromNow(-20) },
  });
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapA.KONTRAK.id },
    data: { status: "FINAL", fileUri: "spk-lab-jaringan.pdf", uploadedById: ppk.id, uploadedAt: daysFromNow(-20) },
  });

  const contractA = await prisma.contract.create({
    data: {
      packageId: pkgA.id,
      vendorId: vendorA.id,
      contractNumber: "SPK/UPBJ/2026/00045",
      contractValue: 812_500_000,
      startDate: daysFromNow(-19),
      endDate: daysFromNow(40),
      status: "ACTIVE",
    },
  });
  await prisma.procurementPackage.update({ where: { id: pkgA.id }, data: { contractValue: 812_500_000 } });
  await prisma.contractMilestone.createMany({
    data: [
      { contractId: contractA.id, name: "Pengiriman Barang Tahap 1", targetDate: daysFromNow(-5), progressPercent: 100, completedAt: daysFromNow(-4) },
      { contractId: contractA.id, name: "Instalasi & Konfigurasi", targetDate: daysFromNow(-2), progressPercent: 60, notes: "Sedang berjalan, sedikit tertunda." },
      { contractId: contractA.id, name: "Uji Fungsi & Serah Terima", targetDate: daysFromNow(15), progressPercent: 0 },
    ],
  });

  await prisma.packageStage.update({
    where: { id: stageMapA.PELAKSANAAN.id },
    data: { status: "IN_PROGRESS", startAt: daysFromNow(-19), targetAt: daysFromNow(-2), picUserId: ppk.id },
  });
  await prisma.procurementPackage.update({
    where: { id: pkgA.id },
    data: { status: "PELAKSANAAN", progressPercent: 5 + 15 + 10 + 15 + 15 + 10 + 10 },
  });

  // SPI: permintaan reviu dari KPA untuk Paket A - dengan temuan yang perlu tindak lanjut PPK
  const spiReqA = await prisma.spiReviewRequest.create({
    data: {
      packageId: pkgA.id,
      requestedBy: kpa.id,
      requestType: "REQUEST",
      reason: "Reviu rutin atas pelaksanaan kontrak bernilai signifikan.",
      scope: "Kesesuaian progres fisik dengan milestone kontrak.",
      requestedAt: daysFromNow(-10),
    },
  });
  const spiReviewA = await prisma.spiReview.create({
    data: {
      reviewRequestId: spiReqA.id,
      reviewerUserId: spi.id,
      reviewStatus: "FOLLOW_UP_REQUIRED",
      riskLevel: "MEDIUM",
      startedAt: daysFromNow(-9),
    },
  });
  await prisma.spiFinding.create({
    data: {
      spiReviewId: spiReviewA.id,
      picUserId: ppk.id,
      category: "Jadwal",
      description: "Milestone 'Instalasi & Konfigurasi' berpotensi terlambat dari target; perlu rencana percepatan.",
      dueDate: daysFromNow(7),
      status: "FOLLOW_UP_REQUIRED",
    },
  });

  // Paket B: menunggu reviu KPA (untuk demo alur persetujuan)
  const pkgB = await createPackage({
    code: "PBJ-2026-JTS-00001",
    rupId: rupB.id,
    name: "Jasa Konsultansi Pengawasan Renovasi Gedung Kuliah",
    procurementType: "Jasa Konsultansi",
    budget: 420_000_000,
    hps: 410_000_000,
  });
  const stagesB = await prisma.packageStage.findMany({ where: { packageId: pkgB.id }, orderBy: { sequenceNo: "asc" } });
  const stageMapB = Object.fromEntries(stagesB.map((s) => [s.stageCode, s]));

  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapB.PERSIAPAN.id },
    data: { status: "APPROVED", fileUri: "kak-hps-pengawasan-gedung.pdf", uploadedById: ppk.id, uploadedAt: daysFromNow(-6) },
  });
  await prisma.packageStage.update({
    where: { id: stageMapB.PERSIAPAN.id },
    data: { status: "COMPLETED", startAt: daysFromNow(-8), completedAt: daysFromNow(-6) },
  });
  await prisma.stageDocument.create({
    data: { stageId: stageMapB.REVIU.id, documentType: "BA_REVIU", required: true, status: "UPLOADED", fileUri: "draf-ba-reviu-pengawasan-gedung.pdf", uploadedById: ppk.id, uploadedAt: daysFromNow(-5) },
  });
  await prisma.packageStage.update({
    where: { id: stageMapB.REVIU.id },
    data: { status: "WAITING_APPROVAL", startAt: daysFromNow(-6), targetAt: daysFromNow(2), picUserId: kpa.id },
  });
  await prisma.procurementPackage.update({
    where: { id: pkgB.id },
    data: { status: "REVIU", progressPercent: 20, kakSummary: "Pengawasan renovasi gedung kuliah 3 lantai.", specification: "Mengacu pada dokumen DED terlampir." },
  });

  // Paket C: baru dibuat, tahap Persiapan dengan dokumen belum lengkap dan target lewat (demo document gate + overdue)
  const pkgC = await createPackage({
    code: "PBJ-2026-UPBJ-00001",
    rupId: rupC.id,
    name: "Pengadaan Alat Tulis Kantor Tahunan",
    procurementType: "Barang",
    budget: 95_000_000,
  });
  const stagesC = await prisma.packageStage.findMany({ where: { packageId: pkgC.id }, orderBy: { sequenceNo: "asc" } });
  const stageMapC = Object.fromEntries(stagesC.map((s) => [s.stageCode, s]));
  await prisma.stageDocument.updateMany({
    where: { stageId: stageMapC.PERSIAPAN.id, documentType: "KAK_SPESIFIKASI" },
    data: { status: "UPLOADED", fileUri: "kak-atk-2026.pdf", uploadedById: stafPpk.id, uploadedAt: daysFromNow(-3) },
  });
  await prisma.packageStage.update({
    where: { id: stageMapC.PERSIAPAN.id },
    data: { status: "WAITING_DOCUMENT", startAt: daysFromNow(-6), targetAt: daysFromNow(-1) },
  });

  // --- Notifikasi contoh ---
  await prisma.notification.createMany({
    data: [
      {
        userId: kpa.id,
        type: "REVIEW_REQUEST",
        title: "Permintaan Reviu KPA",
        message: `Paket ${pkgB.packageName} menunggu reviu/persetujuan Anda.`,
        link: `/packages/${pkgB.id}`,
      },
      {
        userId: ppk.id,
        type: "SPI_FINDING",
        title: "Catatan/Temuan SPI",
        message: "Milestone pelaksanaan berpotensi terlambat, perlu rencana percepatan.",
        link: "/spi/followups",
      },
      {
        userId: admin.id,
        type: "VENDOR_VERIFICATION",
        title: "Permintaan Verifikasi Penyedia",
        message: "CV Sumber Jaya Konstruksi mengajukan verifikasi.",
        link: "/vendors",
      },
    ],
  });

  console.log("Seed selesai.");
  console.log("Kata sandi semua akun demo: polban123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
