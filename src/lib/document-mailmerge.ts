import "server-only";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import { formatDate, formatRupiah } from "@/lib/format";

type DecimalLike = number | string | { toString(): string };

interface PackageLike {
  packageCode: string;
  packageName: string;
  budgetCeiling: DecimalLike;
  rup: { workUnit: { name: string } };
}

interface StageLike {
  approvals: { decision: string; notes: string | null; decidedAt: Date; approver: { fullName: string } }[];
}

interface BidLike {
  vendor: { companyName: string };
  offeredValue: DecimalLike | null;
  status: string;
  technicalScore: DecimalLike | null;
}

interface ContractLike {
  contractNumber: string;
  contractValue: DecimalLike;
  startDate: Date;
  endDate: Date;
  vendor: { companyName: string };
}

// Data placeholder yang tersedia untuk mail-merge template .docx per jenis
// dokumen. Placeholder pada template ditulis dengan sintaks {nama_variabel}
// (dan {#daftar}...{/daftar} untuk perulangan tabel), sesuai konvensi docxtemplater.
export function buildMailMergeData(params: {
  documentType: string;
  documentNumber: string;
  pkg: PackageLike;
  stage: StageLike;
  bids?: BidLike[];
  winningBid?: BidLike | null;
  contract?: ContractLike | null;
}): Record<string, unknown> {
  const { documentType, documentNumber, pkg, stage, bids = [], winningBid, contract } = params;

  const base = {
    nomor_dokumen: documentNumber,
    tanggal: formatDate(new Date()),
    kode_paket: pkg.packageCode,
    nama_paket: pkg.packageName,
    unit_kerja: pkg.rup.workUnit.name,
    pagu_anggaran: formatRupiah(pkg.budgetCeiling),
  };

  if (documentType === "BA_REVIU") {
    return {
      ...base,
      catatan_reviu: stage.approvals.map((a) => ({
        nama: a.approver.fullName,
        keputusan: a.decision,
        catatan: a.notes ?? "-",
        tanggal: formatDate(a.decidedAt),
      })),
    };
  }

  if (documentType === "BA_EVALUASI") {
    return {
      ...base,
      penawaran: bids.map((b) => ({
        penyedia: b.vendor.companyName,
        nilai_penawaran: formatRupiah(b.offeredValue),
        skor_teknis: b.technicalScore != null ? String(b.technicalScore) : "-",
        status: b.status,
      })),
    };
  }

  if (documentType === "BA_HASIL") {
    return {
      ...base,
      ada_pemenang: !!winningBid,
      nama_penyedia: winningBid?.vendor.companyName ?? "-",
      nilai_penawaran: winningBid ? formatRupiah(winningBid.offeredValue) : "-",
    };
  }

  if (documentType === "BAST") {
    return {
      ...base,
      nilai_kontrak: formatRupiah(pkg.budgetCeiling),
    };
  }

  if (documentType === "SPK_KONTRAK") {
    return {
      ...base,
      nomor_kontrak: contract?.contractNumber ?? "-",
      nama_penyedia: contract?.vendor.companyName ?? "-",
      nilai_kontrak: contract ? formatRupiah(contract.contractValue) : "-",
      tanggal_mulai: contract ? formatDate(contract.startDate) : "-",
      tanggal_selesai: contract ? formatDate(contract.endDate) : "-",
    };
  }

  return base;
}

export class DocxTemplateError extends Error {}

export function renderDocxTemplate(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch {
    throw new DocxTemplateError("Berkas template .docx tidak valid atau rusak.");
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });

  try {
    doc.render(data);
  } catch {
    throw new DocxTemplateError(
      "Gagal mengisi template: periksa kembali placeholder pada berkas .docx."
    );
  }

  return doc.getZip().generate({ type: "nodebuffer" });
}

export async function docxBufferToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}
