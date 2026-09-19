import "server-only";
import QRCode from "qrcode";
import crypto from "node:crypto";

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 180 });
}

export function makeVerificationCode(): string {
  return crypto.randomBytes(8).toString("hex");
}

export function makeSignatureHash(parts: (string | number)[]): string {
  return crypto.createHash("sha256").update(parts.join(":")).digest("hex");
}

export function verifyUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://pengadaan-polban.vercel.app";
  return `${base.replace(/\/$/, "")}/verify/${code}`;
}
