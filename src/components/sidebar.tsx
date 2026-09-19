"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_STRUCTURE, APP_NAME } from "@/lib/constants";
import type { RoleCode } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: RoleCode }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
          PB
        </div>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-slate-900">SI Pengadaan</p>
          <p className="text-[10px] text-slate-400">Polban</p>
        </div>
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
