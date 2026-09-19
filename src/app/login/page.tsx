import Link from "next/link";
import { LoginForm } from "./login-form";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";

const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: "admin@polban.ac.id" },
  { role: "KPA", email: "kpa@polban.ac.id" },
  { role: "PPK", email: "ppk@polban.ac.id" },
  { role: "STAF_PPK", email: "stafppk@polban.ac.id" },
  { role: "PEJABAT_PENGADAAN", email: "pejabatpengadaan@polban.ac.id" },
  { role: "SPI", email: "spi@polban.ac.id" },
  { role: "PENYEDIA", email: "vendor@mitrateknik.co.id" },
] as const;

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 px-4 py-10 lg:flex-row lg:items-stretch lg:gap-16">
      <div className="flex max-w-md flex-col justify-center text-white">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
          PB
        </div>
        <h1 className="text-2xl font-semibold leading-snug">{APP_NAME}</h1>
        <p className="mt-3 text-sm text-blue-100/80">
          RUP-first · Verified vendor · Controlled workflow · Document gate ·
          Segregation of duties · Audit trail · Monitoring &amp; early warning ·
          Review &amp; follow-up.
        </p>
        <p className="mt-6 text-xs text-blue-200/60">
          Aplikasi manajemen, monitoring, dokumentasi, dan pengendalian
          pengadaan internal. Bukan pengganti SPSE LKPP. Integrasi
          SiRUP/OSS dilakukan melalui mekanisme resmi atau impor data yang sah.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Masuk</h2>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-slate-500">
            Penyedia baru?{" "}
            <Link href="/register" className="font-medium text-blue-700 hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-xs text-blue-100/70 ring-1 ring-white/10">
          <p className="mb-2 font-semibold text-blue-100">Akun Demo (kata sandi: <code>polban123</code>)</p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.email} className="flex justify-between gap-3">
                <span>{ROLE_LABELS[acc.role]}</span>
                <span className="text-blue-200">{acc.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
