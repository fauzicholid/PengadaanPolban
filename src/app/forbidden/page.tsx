import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <p className="text-5xl">🔒</p>
      <h1 className="text-lg font-semibold text-slate-900">Akses Ditolak</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Peran Anda tidak memiliki kewenangan untuk mengakses halaman ini.
        Hubungi Admin jika Anda merasa ini adalah kesalahan.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        Kembali ke Dasbor
      </Link>
    </div>
  );
}
