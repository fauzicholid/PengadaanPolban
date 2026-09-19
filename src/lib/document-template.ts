import { formatDate, formatRupiah } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

type DecimalLike = number | string | { toString(): string };

interface PackageLike {
  packageCode: string;
  packageName: string;
  budgetCeiling: DecimalLike;
  rup: { workUnit: { name: string } };
}

interface StageLike {
  stageName: string;
  sequenceNo: number;
  completedAt: Date | null;
  approvals: { decision: string; notes: string | null; decidedAt: Date; approver: { fullName: string } }[];
}

interface BidLike {
  vendor: { companyName: string };
  offeredValue: DecimalLike | null;
  status: string;
  technicalScore: DecimalLike | null;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function documentNumber(documentType: string, packageCode: string) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${documentType}/${packageCode}/${stamp}`;
}

export function renderStageDocumentHtml(params: {
  documentType: string;
  pkg: PackageLike;
  stage: StageLike;
  bids?: BidLike[];
  winningBid?: BidLike | null;
}): string {
  const { documentType, pkg, stage, bids = [], winningBid } = params;
  const label = DOCUMENT_TYPE_LABELS[documentType] ?? documentType;
  const number = documentNumber(documentType, pkg.packageCode);
  const today = formatDate(new Date());

  let body = "";

  if (documentType === "BA_REVIU") {
    const rows = stage.approvals
      .map(
        (a) =>
          `<tr><td>${esc(a.approver.fullName)}</td><td>${esc(a.decision)}</td><td>${esc(a.notes ?? "-")}</td><td>${formatDate(a.decidedAt)}</td></tr>`
      )
      .join("");
    body = `
      <p>Pada hari ini, ${today}, telah dilaksanakan reviu terhadap paket pengadaan <strong>${esc(pkg.packageName)}</strong> (${esc(pkg.packageCode)}) oleh unit kerja ${esc(pkg.rup.workUnit.name)} dengan pagu anggaran ${formatRupiah(pkg.budgetCeiling)}.</p>
      <table>
        <thead><tr><th>Nama</th><th>Keputusan</th><th>Catatan</th><th>Tanggal</th></tr></thead>
        <tbody>${rows || "<tr><td colspan=4>Belum ada catatan reviu.</td></tr>"}</tbody>
      </table>`;
  } else if (documentType === "BA_EVALUASI") {
    const rows = bids
      .map(
        (b) =>
          `<tr><td>${esc(b.vendor.companyName)}</td><td>${formatRupiah(b.offeredValue)}</td><td>${b.technicalScore != null ? String(b.technicalScore) : "-"}</td><td>${esc(b.status)}</td></tr>`
      )
      .join("");
    body = `
      <p>Berdasarkan hasil evaluasi administrasi, teknis, dan harga terhadap penawaran yang masuk pada paket <strong>${esc(pkg.packageName)}</strong> (${esc(pkg.packageCode)}), diperoleh hasil sebagai berikut:</p>
      <table>
        <thead><tr><th>Penyedia</th><th>Nilai Penawaran</th><th>Skor Teknis</th><th>Status</th></tr></thead>
        <tbody>${rows || "<tr><td colspan=4>Belum ada penawaran.</td></tr>"}</tbody>
      </table>`;
  } else if (documentType === "BA_HASIL") {
    body = `
      <p>Berdasarkan proses evaluasi dan klarifikasi/negosiasi yang telah dilaksanakan pada paket <strong>${esc(pkg.packageName)}</strong> (${esc(pkg.packageCode)}), ditetapkan penyedia sebagai berikut:</p>
      ${
        winningBid
          ? `<table><tbody>
              <tr><th>Penyedia Terpilih</th><td>${esc(winningBid.vendor.companyName)}</td></tr>
              <tr><th>Nilai Penawaran</th><td>${formatRupiah(winningBid.offeredValue)}</td></tr>
            </tbody></table>`
          : `<p><em>Belum ada penyedia yang ditetapkan sebagai pemenang.</em></p>`
      }
      <p>Berita acara ini menjadi dasar penerbitan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) dan penyusunan kontrak/SPK.</p>`;
  } else if (documentType === "BAST") {
    body = `
      <p>Pada hari ini, ${today}, telah dilaksanakan serah terima hasil pekerjaan/barang untuk paket <strong>${esc(pkg.packageName)}</strong> (${esc(pkg.packageCode)}) dengan nilai kontrak ${formatRupiah(pkg.budgetCeiling)} antara Pejabat Pembuat Komitmen dan penyedia barang/jasa.</p>
      <p>Pekerjaan/barang dinyatakan telah diterima sesuai dengan spesifikasi dan ketentuan yang tercantum dalam kontrak/SPK.</p>`;
  } else {
    body = `<p>Dokumen ${esc(label)} untuk paket <strong>${esc(pkg.packageName)}</strong> (${esc(pkg.packageCode)}).</p>`;
  }

  return `
    <div class="doc-header">
      <p class="doc-kop">SISTEM INFORMASI PENGADAAN BARANG/JASA<br/>POLITEKNIK NEGERI BANDUNG</p>
      <h1>${esc(label).toUpperCase()}</h1>
      <p class="doc-number">Nomor: ${esc(number)}</p>
    </div>
    <div class="doc-body">
      ${body}
    </div>
  `;
}
