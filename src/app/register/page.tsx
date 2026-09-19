import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { PublicRegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Registrasi Penyedia</h1>
          <p className="mt-1 text-sm text-slate-500">{APP_NAME}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <PublicRegisterForm />
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-blue-700 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
