import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Mengirim email melalui Resend API. Bila RESEND_API_KEY belum diatur,
 * fungsi ini tidak gagal — hanya mencatat ke log — supaya aplikasi tetap
 * berjalan normal di lingkungan demo tanpa penyedia email terpasang.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean }> {
  if (!RESEND_API_KEY) {
    console.log(`[email:skip] RESEND_API_KEY belum diatur. Tujuan: ${params.to} — ${params.subject}`);
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) {
      console.error(`[email:error] ${res.status} ${await res.text()}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email:error]", e);
    return { sent: false };
  }
}

const DECISION_LABEL: Record<string, string> = {
  VERIFIED: "Terverifikasi",
  REVISION: "Perlu Perbaikan",
  REJECTED: "Ditolak",
};

const DECISION_COLOR: Record<string, string> = {
  VERIFIED: "#059669",
  REVISION: "#d97706",
  REJECTED: "#dc2626",
};

export function vendorVerificationEmail(params: {
  companyName: string;
  decision: "VERIFIED" | "REVISION" | "REJECTED";
  notes?: string | null;
  verifierName: string;
}) {
  const label = DECISION_LABEL[params.decision];
  const color = DECISION_COLOR[params.decision];
  const subject =
    params.decision === "VERIFIED"
      ? `Perusahaan Anda Telah Diverifikasi — ${params.companyName}`
      : `Status Verifikasi Penyedia: ${label} — ${params.companyName}`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h2 style="color:#1d4ed8;">Sistem Informasi Pengadaan Barang/Jasa Polban</h2>
      <p>Yth. <strong>${params.companyName}</strong>,</p>
      <p>Status verifikasi dan validasi data penyedia Anda telah diperbarui oleh
      unit Staf PPK/Admin menjadi:</p>
      <p style="font-size: 18px; font-weight: bold; color: ${color};">${label}</p>
      ${params.notes ? `<p><strong>Catatan:</strong> ${params.notes}</p>` : ""}
      <p>Diverifikasi oleh: ${params.verifierName}</p>
      ${
        params.decision === "VERIFIED"
          ? "<p>Perusahaan Anda kini dapat menerima undangan dan mengikuti proses pemilihan penyedia pada sistem ini.</p>"
          : "<p>Silakan masuk ke portal penyedia untuk melengkapi/memperbaiki data sesuai catatan di atas, lalu ajukan verifikasi kembali.</p>"
      }
      <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
        Email ini dikirim otomatis oleh sistem. Aplikasi ini bukan pengganti SPSE LKPP.
      </p>
    </div>
  `;

  return { subject, html };
}
