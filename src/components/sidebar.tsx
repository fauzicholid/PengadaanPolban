"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_STRUCTURE, APP_NAME } from "@/lib/constants";
import type { RoleCode } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { useMobileNav } from "@/components/mobile-nav-context";

export function Sidebar({ role }: { role: RoleCode }) {
  const pathname = usePathname();
  const { open, closeNav } = useMobileNav();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-100 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
            PB
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-900">SI Pengadaan</p>
            <p className="text-[10px] text-slate-400">Polban</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeNav}
          aria-label="Tutup menu navigasi"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {MENU_STRUCTURE.map((section) => {
          const items = section.items.filter((item) => item.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={section.section}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeNav}
                      className={cn(
                        "block rounded-lg px-2.5 py-2 text-sm font-medium transition",
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
        {APP_NAME}. Bukan pengganti SPSE LKPP.
      </div>
    </aside>
  );
}
